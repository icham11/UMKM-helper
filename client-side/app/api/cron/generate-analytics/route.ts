import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
// @ts-expect-error arima has no TS declarations
import ARIMA from "arima";
import { groq, GROQ_MODELS } from "@/lib/groq";
import { requireAuth } from "@/lib/auth/session";

/**
 * POST /api/cron/generate-analytics
 *
 * Daily cron job that generates forecasts + health scores for ALL businesses.
 * Designed to be called by an external scheduler (Vercel Cron, GitHub Actions, etc.)
 *
 * Security: requires CRON_SECRET header to prevent unauthorized calls.
 *
 * Headers:
 *   Authorization: Bearer <CRON_SECRET>
 */

async function generateForecastForBusiness(businessId: number) {
  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - 30);
  since.setHours(0, 0, 0, 0);

  const allDates: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    allDates.push(d.toISOString().split("T")[0]);
  }

  // ─── Step 1: Generate Product Demand Forecasts ─────────────────────────
  // We generate product-level predictions FIRST, then aggregate them for business forecast

  type DailyQtyRow = { productId: number; date: string; qty: number };
  const rawRows = await prisma.$queryRaw<DailyQtyRow[]>`
    SELECT
      si."productId"::int AS "productId",
      DATE(s."createdAt") AS "date",
      SUM(si.quantity)::int AS qty
    FROM "SaleItem" si
    JOIN "Sale" s ON s.id = si."saleId"
    WHERE s."businessId" = ${businessId}
      AND s."paymentStatus" = 'Paid'
      AND s."createdAt" >= ${since}
    GROUP BY si."productId", DATE(s."createdAt")
    ORDER BY si."productId", DATE(s."createdAt")
  `;

  const byProduct = new Map<number, { date: string; qty: number }[]>();
  for (const row of rawRows) {
    const pid = Number(row.productId);
    if (!byProduct.has(pid)) byProduct.set(pid, []);
    // Normalize date to YYYY-MM-DD string format
    const dateStr =
      typeof row.date === "string" ? row.date.split("T")[0] : new Date(row.date).toISOString().split("T")[0];
    byProduct.get(pid)!.push({ date: dateStr, qty: Number(row.qty) });
  }

  // Debug: log first few entries to check date format
  if (byProduct.size > 0) {
    const firstProduct = byProduct.entries().next().value;
    if (firstProduct) {
      console.log(
        `[FORECAST] Business ${businessId}: Sample date entries for product ${firstProduct[0]}:`,
        firstProduct[1].slice(0, 3).map((e: { date: string; qty: number }) => e.date),
      );
      console.log(`[FORECAST] Business ${businessId}: Sample allDates:`, allDates.slice(0, 3));
    }
  }

  console.log(`[FORECAST] Business ${businessId}: ${byProduct.size} products with sales data in last 30 days`);

  // Store product forecasts for later aggregation: Map<productId, Array<{date, qty, lower, upper}>>
  const productForecastMap = new Map<number, { date: string; qty: number; lower: number; upper: number }[]>();
  let skippedProducts = 0;

  for (const [productId, entries] of byProduct) {
    const series = allDates.map((d) => {
      const found = entries.find((e) => e.date === d);
      return found ? found.qty : 0;
    });
    const nonZero = series.filter((v) => v > 0).length;

    // Debug for first product
    if (productForecastMap.size === 0 && skippedProducts === 0) {
      console.log(`[FORECAST] Product ${productId}: entries count=${entries.length}, series nonZero=${nonZero}`);
    }

    // Lower threshold: only skip if absolutely no data (at least 1 day of sales needed)
    if (nonZero < 1) {
      skippedProducts++;
      continue;
    }

    let preds: number[];
    let errs: number[];

    // Use ARIMA only if we have sufficient data (5+ days), otherwise use WMA
    if (nonZero >= 5) {
      try {
        const arima = new ARIMA({ auto: true, verbose: false });
        arima.train(series);
        const [p, e] = arima.predict(7) as [number[], number[]];
        preds = p;
        errs = e;
      } catch {
        // Fallback to WMA
        const window = Math.min(series.length, 14);
        const recent = series.slice(-window);
        let wSum = 0,
          wTotal = 0;
        recent.forEach((v, idx) => {
          const w = idx + 1;
          wSum += v * w;
          wTotal += w;
        });
        preds = Array(7).fill(Math.round(wSum / wTotal));
        errs = Array(7).fill(1);
      }
    } else {
      // Not enough data for ARIMA - use simple weighted moving average
      const window = Math.min(series.length, 14);
      const recent = series.slice(-window);
      let wSum = 0,
        wTotal = 0;
      recent.forEach((v, idx) => {
        const w = idx + 1;
        wSum += v * w;
        wTotal += w;
      });
      const wma = wTotal > 0 ? Math.round(wSum / wTotal) : 0;
      preds = Array(7).fill(wma);
      errs = Array(7).fill(Math.max(1, wma * 0.3)); // Wider error bands for limited data
    }

    const maxQty = Math.max(...series, 1);
    preds = preds.map((v) => Math.max(0, Math.min(v, maxQty * 2)));
    const avgQty = series.reduce((s, v) => s + v, 0) / nonZero;
    const qtyCap = Math.max(avgQty * 3, 1);

    const forecastsForProduct: { date: string; qty: number; lower: number; upper: number }[] = [];

    await Promise.all(
      preds.map((val, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() + i + 1);
        const dateStr = date.toISOString().split("T")[0];
        const se = errs?.[i] ?? Math.abs(val) * 0.2;
        const qty = Math.max(0, Math.round(val));
        const lower = Math.max(0, Math.round(val - 1.96 * se));
        const rawUpper = Math.round(val + 1.96 * se);
        const upper = Math.max(qty, Math.min(rawUpper, Math.round(qty + qtyCap)));
        const confidence = Math.max(0, Math.min(100, 90 - i * 4));
        const rec = qty === 0 ? "Tidak perlu produksi" : `Produksi ~${Math.ceil(qty * 1.1)} unit (buffer 10%)`;

        forecastsForProduct.push({ date: dateStr, qty, lower, upper });

        return prisma.productForecast.upsert({
          where: { productId_date: { productId, date: new Date(dateStr) } },
          update: {
            predictedQty: qty,
            lowerBound: lower,
            upperBound: upper,
            confidenceScore: confidence,
            recommendedProduction: rec,
          },
          create: {
            productId,
            date: new Date(dateStr),
            predictedQty: qty,
            lowerBound: lower,
            upperBound: upper,
            confidenceScore: confidence,
            recommendedProduction: rec,
          },
        });
      }),
    );

    productForecastMap.set(productId, forecastsForProduct);
  }

  console.log(
    `[FORECAST] Business ${businessId}: Generated forecasts for ${productForecastMap.size} products, skipped ${skippedProducts} (insufficient data)`,
  );

  // ─── Step 2: Calculate Business Forecast from Product Forecasts ────────
  // Aggregate: predictedRevenue = Σ(predictedQty × sellingPrice)
  //            predictedCost = Σ(predictedQty × recipeCost)
  //            predictedProfit = predictedRevenue - predictedCost

  console.log(`[FORECAST] Business ${businessId}: ${productForecastMap.size} products with forecasts`);

  // Get all products with their prices for this business
  const products = await prisma.product.findMany({
    where: { businessId, deletedAt: null, isActive: true },
    select: { id: true, sellingPrice: true, recipeCost: true },
  });

  console.log(`[FORECAST] Business ${businessId}: ${products.length} active products with prices`);

  const productPriceMap = new Map<number, { sellingPrice: number; recipeCost: number }>();
  for (const p of products) {
    productPriceMap.set(p.id, {
      sellingPrice: Number(p.sellingPrice),
      recipeCost: Number(p.recipeCost),
    });
  }

  // Generate forecast dates
  const forecastDates: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    forecastDates.push(d.toISOString().split("T")[0]);
  }

  // Aggregate daily forecasts
  const dailyAggregates: {
    date: string;
    predictedRevenue: number;
    predictedCost: number;
    lowerRevenue: number;
    upperRevenue: number;
  }[] = [];

  for (const dateStr of forecastDates) {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalLowerRevenue = 0;
    let totalUpperRevenue = 0;

    for (const [productId, forecasts] of productForecastMap) {
      const dayForecast = forecasts.find((f) => f.date === dateStr);
      if (!dayForecast) continue;

      const prices = productPriceMap.get(productId);
      if (!prices) continue;

      totalRevenue += dayForecast.qty * prices.sellingPrice;
      totalCost += dayForecast.qty * prices.recipeCost;
      totalLowerRevenue += dayForecast.lower * prices.sellingPrice;
      totalUpperRevenue += dayForecast.upper * prices.sellingPrice;
    }

    dailyAggregates.push({
      date: dateStr,
      predictedRevenue: Math.round(totalRevenue),
      predictedCost: Math.round(totalCost),
      lowerRevenue: Math.round(totalLowerRevenue),
      upperRevenue: Math.round(totalUpperRevenue),
    });
  }

  // If no product forecasts available, fall back to historical average
  if (dailyAggregates.length === 0 || dailyAggregates.every((d) => d.predictedRevenue === 0)) {
    console.log(`[FORECAST] Business ${businessId}: Using fallback (no product forecasts aggregated)`);
    // Fallback: use historical BusinessMetrics average
    const bizMetrics = await prisma.businessMetrics.findMany({
      where: { businessId, date: { gte: since } },
      orderBy: { date: "asc" },
    });

    if (bizMetrics.length >= 7) {
      const avgRevenue = bizMetrics.reduce((s, m) => s + Number(m.totalRevenue), 0) / bizMetrics.length;
      const avgProfit = bizMetrics.reduce((s, m) => s + Number(m.totalProfit), 0) / bizMetrics.length;

      for (let i = 0; i < forecastDates.length; i++) {
        dailyAggregates[i] = {
          date: forecastDates[i],
          predictedRevenue: Math.round(avgRevenue),
          predictedCost: Math.round(avgRevenue - avgProfit),
          lowerRevenue: Math.round(avgRevenue * 0.7),
          upperRevenue: Math.round(avgRevenue * 1.3),
        };
      }
    }
  }

  // Save business forecasts
  if (dailyAggregates.length > 0) {
    console.log(
      `[FORECAST] Business ${businessId}: Saving ${dailyAggregates.length} days, first day revenue = ${dailyAggregates[0]?.predictedRevenue}`,
    );
    await Promise.all(
      dailyAggregates.map((agg, i) => {
        const predictedProfit = agg.predictedRevenue - agg.predictedCost;
        const confidence = Math.max(0, Math.min(100, 95 - i * 3));

        return prisma.businessForecast.upsert({
          where: { businessId_date: { businessId, date: new Date(agg.date) } },
          update: {
            predictedRevenue: agg.predictedRevenue,
            predictedProfit: Math.max(0, predictedProfit),
            lowerBound: agg.lowerRevenue,
            upperBound: agg.upperRevenue,
            confidenceScore: confidence,
          },
          create: {
            businessId,
            date: new Date(agg.date),
            predictedRevenue: agg.predictedRevenue,
            predictedProfit: Math.max(0, predictedProfit),
            lowerBound: agg.lowerRevenue,
            upperBound: agg.upperRevenue,
            confidenceScore: confidence,
          },
        });
      }),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH SCORE GENERATION — calculates and saves daily business health scores
// ═══════════════════════════════════════════════════════════════════════════════

async function generateHealthScoreForBusiness(businessId: number) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const since30d = new Date(today);
  since30d.setDate(since30d.getDate() - 30);

  // ─── 1. Get Business Metrics for last 30 days ───
  const metrics = await prisma.businessMetrics.findMany({
    where: {
      businessId,
      date: { gte: since30d },
    },
    orderBy: { date: "asc" },
  });

  const totalRevenue30d = metrics.reduce((sum, m) => sum + Number(m.totalRevenue), 0);
  const totalProfit30d = metrics.reduce((sum, m) => sum + Number(m.totalProfit), 0);
  const avgMargin = totalRevenue30d > 0 ? (totalProfit30d / totalRevenue30d) * 100 : 0;

  // ─── 2. Get Waste Data for last 30 days ───
  const wasteMovements = await prisma.$queryRaw<{ totalWasteCost: number }[]>`
    SELECT COALESCE(SUM(ABS(im.quantity) * im."costPerUnit"), 0)::numeric AS "totalWasteCost"
    FROM "InventoryMovement" im
    JOIN "StockDocument" sd ON sd.id = im."stockDocumentId"
    WHERE sd."businessId" = ${businessId}
      AND sd.type = 'Waste'
      AND im."createdAt" >= ${since30d}
  `;
  const totalWasteCost = Number(wasteMovements[0]?.totalWasteCost ?? 0);
  const wastePercentage = totalRevenue30d > 0 ? (totalWasteCost / totalRevenue30d) * 100 : 0;

  // ─── 3. Calculate Revenue Score (0-25) ───
  // Dynamic target: 120% of business's own average monthly revenue
  // This auto-adapts to each business's scale
  const avgDailyRevenue = metrics.length > 0 ? totalRevenue30d / metrics.length : 0;
  const REVENUE_TARGET = Math.max(avgDailyRevenue * 30 * 1.2, 100000); // Min 100k to avoid division issues
  const revenueScore = Math.min(25, (totalRevenue30d / REVENUE_TARGET) * 25);

  // ─── 4. Calculate Profit Score (0-25) ───
  // Linear scale: 50%+ margin = 25, 0% = 0
  const MARGIN_TARGET = 50;
  const profitScore = Math.min(25, (avgMargin / MARGIN_TARGET) * 25);

  // ─── 5. Calculate Waste Score (0-25) ───
  // Inverted: lower waste = higher score
  // <1% waste = 25, 5%+ waste = 0
  const wasteScore = Math.max(0, 25 - wastePercentage * 5);

  // ─── 6. Calculate Stability Score (0-25) ───
  // Uses Coefficient of Variation of daily revenue
  // CoV < 0.3 = very stable (25), CoV > 1 = unstable (0)
  let stabilityScore = 12.5; // Default middle score if not enough data

  if (metrics.length >= 7) {
    const dailyRevenues = metrics.map((m) => Number(m.totalRevenue));
    const mean = dailyRevenues.reduce((a, b) => a + b, 0) / dailyRevenues.length;

    if (mean > 0) {
      const squaredDiffs = dailyRevenues.map((rev) => Math.pow(rev - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / dailyRevenues.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / mean;

      // Scale: CoV 0 = 25, CoV 1+ = 0
      stabilityScore = Math.max(0, Math.min(25, 25 - coefficientOfVariation * 25));
    }
  }

  // ─── 7. Calculate Overall Score ───
  const overallScore = revenueScore + profitScore + wasteScore + stabilityScore;

  // ─── 8. Determine Classification ───
  let classification: string;
  if (overallScore >= 80) classification = "Excellent";
  else if (overallScore >= 60) classification = "Healthy";
  else if (overallScore >= 40) classification = "Warning";
  else classification = "Critical";

  // ─── 9. Save to Database ───
  await prisma.businessHealthScores.upsert({
    where: { businessId_date: { businessId, date: today } },
    update: {
      revenueScore,
      profitScore,
      wasteScore,
      stabilityScore,
      overallScore,
      classification,
    },
    create: {
      businessId,
      date: today,
      revenueScore,
      profitScore,
      wasteScore,
      stabilityScore,
      overallScore,
      classification,
    },
  });

  console.log(
    `[HEALTH] Business ${businessId}: revenue=${revenueScore.toFixed(1)}, profit=${profitScore.toFixed(1)}, waste=${wasteScore.toFixed(1)}, stability=${stabilityScore.toFixed(1)}, overall=${overallScore.toFixed(1)} (${classification})`,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI INSIGHT GENERATION — brief chart labels per section
// ═══════════════════════════════════════════════════════════════════════════════

const INSIGHT_SECTIONS: { key: string; prompt: string; gather: (bid: number) => Promise<string> }[] = [
  {
    key: "revenue",
    prompt: "Berikan 1-2 kalimat ringkas tentang tren pendapatan harian bisnis ini. Sebutkan pola kunci.",
    gather: async (bid) => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const m = await prisma.businessMetrics.findMany({
        where: { businessId: bid, date: { gte: since } },
        orderBy: { date: "asc" },
      });
      const total = m.reduce((s, x) => s + Number(x.totalRevenue), 0);
      const avg = Math.round(total / 30);
      return `Pendapatan 30 hari: Rp ${total.toLocaleString("id-ID")}, rata-rata harian Rp ${avg.toLocaleString("id-ID")}.`;
    },
  },
  {
    key: "growth",
    prompt: "Berikan 1-2 kalimat ringkas tentang pertumbuhan bisnis bulan ini vs bulan lalu.",
    gather: async (bid) => {
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const [cur, prev] = await Promise.all([
        prisma.businessMetrics.findMany({ where: { businessId: bid, date: { gte: thisMonth } } }),
        prisma.businessMetrics.findMany({ where: { businessId: bid, date: { gte: lastMonth, lt: thisMonth } } }),
      ]);
      const curRev = cur.reduce((s, x) => s + Number(x.totalRevenue), 0);
      const prevRev = prev.reduce((s, x) => s + Number(x.totalRevenue), 0);
      const growth = prevRev > 0 ? (((curRev - prevRev) / prevRev) * 100).toFixed(1) : "N/A";
      return `Pendapatan bulan ini: Rp ${curRev.toLocaleString("id-ID")}, bulan lalu: Rp ${prevRev.toLocaleString("id-ID")}, pertumbuhan: ${growth}%.`;
    },
  },
  {
    key: "products",
    prompt: "Berikan 1-2 kalimat ringkas tentang performa produk — mana yang paling laris dan paling menguntungkan.",
    gather: async (bid) => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const rows = await prisma.$queryRaw<{ name: string; qty: number; revenue: number }[]>`
        SELECT p.name, SUM(si.quantity)::int AS qty, SUM(si.quantity * si."priceAtSale")::numeric AS revenue
        FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId"
        JOIN "Product" p ON p.id = si."productId"
        WHERE s."businessId" = ${bid} AND s."paymentStatus" = 'Paid' AND s."createdAt" >= ${since}
        GROUP BY p.name ORDER BY revenue DESC LIMIT 5
      `;
      if (rows.length === 0) return "Belum ada data penjualan produk 30 hari terakhir.";
      return `Top produk: ${rows.map((r) => `${r.name} (${r.qty} pcs, Rp ${Number(r.revenue).toLocaleString("id-ID")})`).join(", ")}.`;
    },
  },
  {
    key: "health",
    prompt: "Berikan 1-2 kalimat ringkas tentang skor kesehatan bisnis dan klasifikasi saat ini.",
    gather: async (bid) => {
      const latest = await prisma.businessHealthScores.findFirst({
        where: { businessId: bid },
        orderBy: { date: "desc" },
      });
      if (!latest) return "Belum ada data skor kesehatan bisnis.";
      return `Skor: overall ${latest.overallScore.toFixed(1)}, revenue ${latest.revenueScore.toFixed(1)}, profit ${latest.profitScore.toFixed(1)}, waste ${latest.wasteScore.toFixed(1)}, stability ${latest.stabilityScore.toFixed(1)}. Klasifikasi: ${latest.classification ?? "N/A"}.`;
    },
  },
  {
    key: "waste",
    prompt: "Berikan 1-2 kalimat ringkas tentang tingkat limbah/waste bisnis ini terhadap pendapatan.",
    gather: async (bid) => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const wasteMoves = await prisma.$queryRaw<{ totalWaste: number }[]>`
        SELECT COALESCE(SUM(ABS(im.quantity) * ib."costPerUnit"), 0)::numeric AS "totalWaste"
        FROM "InventoryMovement" im
        JOIN "InventoryBatch" ib ON ib.id = im."batchId"
        JOIN "Ingredient" ing ON ing.id = im."ingredientId"
        WHERE ing."businessId" = ${bid} AND im.type = 'waste' AND im."createdAt" >= ${since}
      `;
      const waste = Number(wasteMoves[0]?.totalWaste ?? 0);
      const metrics = await prisma.businessMetrics.findMany({ where: { businessId: bid, date: { gte: since } } });
      const rev = metrics.reduce((s, m) => s + Number(m.totalRevenue), 0);
      const pct = rev > 0 ? ((waste / rev) * 100).toFixed(1) : "0";
      return `Biaya limbah 30 hari: Rp ${waste.toLocaleString("id-ID")} (${pct}% dari pendapatan Rp ${rev.toLocaleString("id-ID")}).`;
    },
  },
  {
    key: "kasbon",
    prompt: "Berikan 1-2 kalimat ringkas tentang status kasbon/piutang bisnis ini.",
    gather: async (bid) => {
      const debts = await prisma.debt.findMany({
        where: { businessId: bid },
        include: { payments: true },
      });
      const total = debts.reduce((s, d) => s + Number(d.totalAmount), 0);
      const paid = debts.reduce((s, d) => s + d.payments.reduce((ps, p) => ps + Number(p.amount), 0), 0);
      const outstanding = total - paid;
      const overdue = debts.filter((d) => d.status === "overdue").length;
      return `Total kasbon: Rp ${total.toLocaleString("id-ID")}, terbayar: Rp ${paid.toLocaleString("id-ID")}, sisa: Rp ${outstanding.toLocaleString("id-ID")}, jatuh tempo: ${overdue}.`;
    },
  },
  {
    key: "forecast",
    prompt: "Berikan 1-2 kalimat ringkas tentang prediksi pendapatan dan laba 7 hari ke depan berdasarkan data ini.",
    gather: async (bid) => {
      const fc = await prisma.businessForecast.findMany({
        where: { businessId: bid },
        orderBy: { date: "asc" },
      });
      if (fc.length === 0) return "Belum ada data prediksi.";
      return fc
        .map(
          (f) =>
            `${f.date.toISOString().split("T")[0]}: rev Rp ${Number(f.predictedRevenue).toLocaleString("id-ID")}, profit Rp ${Number(f.predictedProfit).toLocaleString("id-ID")}, keyakinan ${Number(f.confidenceScore)}%`,
        )
        .join("; ");
    },
  },
];

async function generateInsightsForBusiness(businessId: number) {
  for (const section of INSIGHT_SECTIONS) {
    try {
      const dataContext = await section.gather(businessId);
      if (dataContext.includes("Belum ada")) {
        // Skip sections with no data
        continue;
      }

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "Kamu adalah konsultan bisnis AI untuk UMKM Indonesia. Berikan ringkasan SANGAT singkat (1-2 kalimat) dalam Bahasa Indonesia. Jangan gunakan markdown. Langsung ke poin utama.",
          },
          {
            role: "user",
            content: `${section.prompt}\n\nData:\n${dataContext}`,
          },
        ],
        model: GROQ_MODELS.text.primary,
        temperature: 0.3,
        max_tokens: 150,
      });

      const insight = completion.choices[0]?.message?.content?.trim();
      if (!insight) continue;

      await prisma.analyticsInsight.upsert({
        where: { businessId_section: { businessId, section: section.key } },
        update: { insight, generatedAt: new Date() },
        create: { businessId, section: section.key, insight, generatedAt: new Date() },
      });
    } catch (err) {
      console.error(`[CRON] Insight generation failed for biz ${businessId}, section ${section.key}:`, err);
    }
  }
}

export async function POST(req: NextRequest) {
  // Allow access via CRON_SECRET or authenticated user session
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const hasCronSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

  let authedUser: { userId: number; businessId: number } | null = null;
  if (!hasCronSecret) {
    try {
      authedUser = await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // If called by an authenticated user, only generate for their business
    // If called by cron (CRON_SECRET), generate for all businesses
    const businesses = authedUser
      ? await prisma.business.findMany({ where: { id: authedUser.businessId }, select: { id: true, name: true } })
      : await prisma.business.findMany({ select: { id: true, name: true } });
    const results: { businessId: number; name: string; status: string }[] = [];

    for (const biz of businesses) {
      try {
        await generateForecastForBusiness(biz.id);
        await generateHealthScoreForBusiness(biz.id);
        await generateInsightsForBusiness(biz.id);
        results.push({ businessId: biz.id, name: biz.name, status: "success" });
      } catch (err) {
        console.error(`[CRON] Forecast failed for business ${biz.id}:`, err);
        results.push({ businessId: biz.id, name: biz.name, status: `error: ${String(err).slice(0, 100)}` });
      }
    }

    console.log(
      `[CRON] Analytics generation complete: ${results.filter((r) => r.status === "success").length}/${results.length} succeeded`,
    );

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error("[CRON] generate-analytics error:", error);
    return NextResponse.json({ error: "Failed to generate analytics", details: String(error) }, { status: 500 });
  }
}
