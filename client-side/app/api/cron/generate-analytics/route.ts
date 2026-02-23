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

function clampOutliers(series: number[]): number[] {
  if (series.length < 4) return series;
  const sorted = [...series].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const upper = q3 + 2.0 * iqr;
  const lower = Math.max(0, q1 - 2.0 * iqr);
  return series.map((v) => Math.min(Math.max(v, lower), upper));
}

function wmaPredictions(series: number[], horizon: number) {
  const window = Math.min(series.length, 14);
  const recent = series.slice(-window);
  let wSum = 0,
    wTotal = 0;
  recent.forEach((v, i) => {
    const w = i + 1;
    wSum += v * w;
    wTotal += w;
  });
  const wma = wSum / wTotal;
  return Array.from({ length: horizon }, () => Math.round(wma));
}

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

  // ─── Business Revenue Forecast ─────────────────────────────────────────
  const bizMetrics = await prisma.businessMetrics.findMany({
    where: { businessId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  const revSeriesRaw = bizMetrics.map((m) => Number(m.totalRevenue));
  const profitSeriesRaw = bizMetrics.map((m) => Number(m.totalProfit));
  const revSeries = clampOutliers(revSeriesRaw);
  const profitSeries = clampOutliers(profitSeriesRaw);
  const avgRevenue = revSeries.length > 0 ? revSeries.reduce((s, v) => s + v, 0) / revSeries.length : 0;
  const avgProfit = profitSeries.length > 0 ? profitSeries.reduce((s, v) => s + v, 0) / profitSeries.length : 0;
  const maxHistorical = revSeriesRaw.length > 0 ? Math.max(...revSeriesRaw) : 0;
  const maxHistoricalProfit = profitSeriesRaw.length > 0 ? Math.max(...profitSeriesRaw) : 0;

  if (revSeries.length >= 11) {
    // ── Revenue ARIMA ──
    let predictions: number[] | null = null;
    let errors: number[] | null = null;

    try {
      const autoArima = new ARIMA({ auto: true, verbose: false });
      autoArima.train(revSeries);
      const [p, e] = autoArima.predict(7) as [number[], number[]];
      predictions = p;
      errors = e;
    } catch {
      try {
        const fallback = new ARIMA({ p: 1, d: 0, q: 1, verbose: false });
        fallback.train(revSeries);
        const [p, e] = fallback.predict(7) as [number[], number[]];
        predictions = p;
        errors = e;
      } catch {
        /* use WMA */
      }
    }

    if (!predictions) {
      predictions = wmaPredictions(revSeries, 7);
      errors = predictions.map(() => avgRevenue * 0.2);
    }

    // ── Profit ARIMA ──
    let profitPredictions: number[] | null = null;

    try {
      const profitArima = new ARIMA({ auto: true, verbose: false });
      profitArima.train(profitSeries);
      const [pp] = profitArima.predict(7) as [number[], number[]];
      profitPredictions = pp;
    } catch {
      try {
        const fallback = new ARIMA({ p: 1, d: 0, q: 1, verbose: false });
        fallback.train(profitSeries);
        const [pp] = fallback.predict(7) as [number[], number[]];
        profitPredictions = pp;
      } catch {
        /* use WMA */
      }
    }

    if (!profitPredictions) {
      profitPredictions = wmaPredictions(profitSeries, 7);
    }

    const predCap = maxHistorical * 2;
    predictions = predictions.map((v) => Math.max(0, Math.min(v, predCap)));
    const profitCap = maxHistoricalProfit * 2;
    profitPredictions = profitPredictions.map((v) => Math.max(0, Math.min(v, profitCap)));
    const bandCap = avgRevenue * 1.5;

    const bizForecast = predictions.map((val, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() + i + 1);
      const se = errors?.[i] ?? avgRevenue * 0.15;
      const predicted = Math.max(0, Math.round(val));
      const predictedProfit = Math.max(0, Math.round(profitPredictions![i]));
      const lower = Math.max(0, Math.round(val - 1.96 * se));
      const upper = Math.min(Math.round(val + 1.96 * se), Math.round(predicted + bandCap));
      return {
        date: date.toISOString().split("T")[0],
        predictedRevenue: predicted,
        predictedProfit,
        lowerBound: lower,
        upperBound: Math.max(upper, predicted),
        confidenceScore: Math.round(Math.max(0, Math.min(100, 95 - i * 3))),
      };
    });

    await Promise.all(
      bizForecast.map((f) =>
        prisma.businessForecast.upsert({
          where: { businessId_date: { businessId, date: new Date(f.date) } },
          update: {
            predictedRevenue: f.predictedRevenue,
            predictedProfit: f.predictedProfit,
            lowerBound: f.lowerBound,
            upperBound: f.upperBound,
            confidenceScore: f.confidenceScore,
          },
          create: {
            businessId,
            date: new Date(f.date),
            predictedRevenue: f.predictedRevenue,
            predictedProfit: f.predictedProfit,
            lowerBound: f.lowerBound,
            upperBound: f.upperBound,
            confidenceScore: f.confidenceScore,
          },
        }),
      ),
    );
  }

  // ─── Product Demand Forecast ───────────────────────────────────────────
  type DailyQtyRow = { productId: number; date: string; qty: number };
  const rawRows = await prisma.$queryRaw<DailyQtyRow[]>`
    SELECT
      si."productId"::int AS "productId",
      DATE(s."createdAt") AS "date",
      SUM(si.quantity)::int AS qty
    FROM "SaleItem" si
    JOIN "Sale" s ON s.id = si."saleId"
    WHERE s."businessId" = ${businessId}
      AND s."createdAt" >= ${since}
    GROUP BY si."productId", DATE(s."createdAt")
    ORDER BY si."productId", DATE(s."createdAt")
  `;

  const byProduct = new Map<number, { date: string; qty: number }[]>();
  for (const row of rawRows) {
    const pid = Number(row.productId);
    if (!byProduct.has(pid)) byProduct.set(pid, []);
    byProduct.get(pid)!.push({ date: row.date, qty: Number(row.qty) });
  }

  for (const [productId, entries] of byProduct) {
    const series = allDates.map((d) => {
      const found = entries.find((e) => e.date === d);
      return found ? found.qty : 0;
    });
    const nonZero = series.filter((v) => v > 0).length;
    if (nonZero < 5) continue;

    let preds: number[];
    let errs: number[];
    try {
      const arima = new ARIMA({ auto: true, verbose: false });
      arima.train(series);
      const [p, e] = arima.predict(7) as [number[], number[]];
      preds = p;
      errs = e;
    } catch {
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

    const maxQty = Math.max(...series);
    preds = preds.map((v) => Math.max(0, Math.min(v, maxQty * 2)));
    const avgQty = series.reduce((s, v) => s + v, 0) / nonZero;
    const qtyCap = Math.max(avgQty * 3, 1);

    await Promise.all(
      preds.map((val, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() + i + 1);
        const se = errs?.[i] ?? Math.abs(val) * 0.2;
        const qty = Math.max(0, Math.round(val));
        const lower = Math.max(0, Math.round(val - 1.96 * se));
        const rawUpper = Math.round(val + 1.96 * se);
        const upper = Math.max(qty, Math.min(rawUpper, Math.round(qty + qtyCap)));
        const confidence = Math.max(0, Math.min(100, 90 - i * 4));
        const rec = qty === 0 ? "Tidak perlu produksi" : `Produksi ~${Math.ceil(qty * 1.1)} unit (buffer 10%)`;

        return prisma.productForecast.upsert({
          where: { productId_date: { productId, date: new Date(date.toISOString().split("T")[0]) } },
          update: {
            predictedQty: qty,
            lowerBound: lower,
            upperBound: upper,
            confidenceScore: confidence,
            recommendedProduction: rec,
          },
          create: {
            productId,
            date: new Date(date.toISOString().split("T")[0]),
            predictedQty: qty,
            lowerBound: lower,
            upperBound: upper,
            confidenceScore: confidence,
            recommendedProduction: rec,
          },
        });
      }),
    );
  }
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
      const avg = m.length > 0 ? Math.round(total / m.length) : 0;
      const activeDays = m.filter((x) => Number(x.totalRevenue) > 0).length;
      return `Pendapatan 30 hari: Rp ${total.toLocaleString("id-ID")}, rata-rata harian Rp ${avg.toLocaleString("id-ID")}, ${activeDays} hari aktif dari ${m.length}.`;
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
        WHERE s."businessId" = ${bid} AND s."createdAt" >= ${since}
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
