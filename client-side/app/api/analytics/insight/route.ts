import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/session";
import { groq, GROQ_MODELS } from "@/lib/groq";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { businessId } = await requireAuth();

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // ── Gather all business data ──
    const [metrics, sales, products, ingredients] = await Promise.all([
      prisma.businessMetrics.findMany({
        where: { businessId, date: { gte: firstDay, lte: lastDay } },
      }),
      prisma.sale.findMany({
        where: { businessId, createdAt: { gte: firstDay, lte: lastDay } },
        include: {
          saleItems: {
            include: {
              product: { select: { name: true, sellingPrice: true, id: true, category: { select: { name: true } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.product.findMany({
        where: { businessId },
        select: { id: true, name: true, sellingPrice: true },
      }),
      prisma.ingredient.findMany({
        where: { businessId },
        include: {
          inventoryBatches: {
            where: { remainingQty: { gt: 0 } },
            select: { remainingQty: true, costPerUnit: true },
          },
        },
      }),
    ]);

    const totalRevenue = metrics.reduce((sum, m) => sum + Number(m.totalRevenue), 0);
    const totalProfit = metrics.reduce((sum, m) => sum + Number(m.totalProfit), 0);
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const txCount = sales.length;

    // Product sales ranking
    const productSales: Record<string, number> = {};
    for (const sale of sales) {
      for (const item of sale.saleItems) {
        const name = item.product?.name || `Produk #${item.productId}`;
        productSales[name] = (productSales[name] || 0) + item.quantity;
      }
    }
    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => `${name}: ${qty} pcs`);

    // Top categories
    const categorySales: Record<string, number> = {};
    for (const sale of sales) {
      for (const item of sale.saleItems) {
        const category = item.product?.category?.name || "Lain-lain";
        categorySales[category] = (categorySales[category] || 0) + item.quantity;
      }
    }
    const topCategories = Object.entries(categorySales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, qty]) => `${name}: ${qty} pcs`);

    // Low stock
    const lowStock = ingredients
      .map((ing) => {
        const stock = ing.inventoryBatches.reduce((s, b) => s + Number(b.remainingQty), 0);
        return { name: ing.name, stock, min: ing.minStock };
      })
      .filter((i) => i.min > 0 && i.stock <= i.min);

    // Product price listing
    const productPrices = products
      .map((p) => ({
        name: p.name,
        price: `Rp ${Number(p.sellingPrice).toLocaleString("id-ID")}`,
      }))
      .slice(0, 10);

    // ── Build AI prompt ──
    const dataContext = `
BUSINESS DATA (Bulan ini, ${today.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}):

📊 KEUANGAN:
- Total Revenue: Rp ${totalRevenue.toLocaleString("id-ID")}
- Total Profit: Rp ${totalProfit.toLocaleString("id-ID")}
- Margin: ${margin.toFixed(1)}%
- Jumlah Transaksi: ${txCount}
- Rata-rata per transaksi: Rp ${txCount > 0 ? Math.round(totalRevenue / txCount).toLocaleString("id-ID") : 0}

🏆 TOP PRODUK:
${topProducts.length > 0 ? topProducts.join("\n") : "Belum ada data penjualan"}

📈 TOP KATEGORI:
${topCategories.length > 0 ? topCategories.join("\n") : "Belum ada data kategori"}

⚠️ STOK RENDAH:
${lowStock.length > 0 ? lowStock.map((i) => `${i.name}: sisa ${i.stock} (min: ${i.min})`).join("\n") : "Semua stok aman"}

💰 HARGA PRODUK:
${productPrices.length > 0 ? productPrices.map((p) => `${p.name}: ${p.price}`).join("\n") : "Belum ada produk"}

📦 TOTAL PRODUK: ${products.length}
🧂 TOTAL BAHAN BAKU: ${ingredients.length}
`.trim();

    const systemPrompt = `Kamu adalah konsultan bisnis AI untuk UMKM (Usaha Mikro Kecil Menengah) di Indonesia.
Berikan analisis dalam Bahasa Indonesia yang singkat, padat, dan actionable.

PENTING: Output harus berformat JSON VALID seperti ini:
{
  "summary": "Ringkasan eksekutif 2-3 kalimat tentang kondisi bisnis",
  "insights": [
    {
      "category": "revenue|profit|inventory|product|growth",
      "severity": "success|warning|danger|info",
      "title": "Judul singkat (max 8 kata)",
      "description": "Penjelasan detail dan saran actionable (1-2 kalimat)",
      "metric": "Angka atau persentase kunci terkait"
    }
  ]
}

Berikan 5-7 insights yang beragam dan spesifik berdasarkan data. Jangan generic.`;

    let aiInsights = null;

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: dataContext },
        ],
        model: GROQ_MODELS.text.primary,
        temperature: 0.4,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content || "";
      aiInsights = JSON.parse(raw);
    } catch (err) {
      console.warn("AI insight generation failed, trying fallback:", err instanceof Error ? err.message : err);

      try {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: dataContext },
          ],
          model: GROQ_MODELS.text.fallback,
          temperature: 0.4,
          max_tokens: 1200,
          response_format: { type: "json_object" },
        });

        const raw = completion.choices[0]?.message?.content || "";
        aiInsights = JSON.parse(raw);
      } catch {
        console.warn("Fallback AI also failed, using rule-based");
      }
    }

    // ── Fallback rule-based ──
    if (!aiInsights) {
      const insights = [];

      if (totalRevenue > 500_000) {
        insights.push({
          category: "revenue",
          severity: "success",
          title: "Revenue bulan ini baik",
          description: `Revenue sudah mencapai Rp ${totalRevenue.toLocaleString("id-ID")}. Pertahankan strategi saat ini.`,
          metric: `Rp ${formatShort(totalRevenue)}`,
        });
      } else {
        insights.push({
          category: "revenue",
          severity: "warning",
          title: "Revenue perlu ditingkatkan",
          description: "Coba tingkatkan volume penjualan dengan promo atau bundling produk.",
          metric: `Rp ${formatShort(totalRevenue)}`,
        });
      }

      if (margin > 40) {
        insights.push({
          category: "profit",
          severity: "success",
          title: "Margin profit sangat sehat",
          description: `Margin ${margin.toFixed(1)}% menunjukkan pricing yang baik.`,
          metric: `${margin.toFixed(1)}%`,
        });
      } else {
        insights.push({
          category: "profit",
          severity: "danger",
          title: "Margin profit perlu perhatian",
          description: "Evaluasi cost bahan baku dan harga jual untuk meningkatkan margin.",
          metric: `${margin.toFixed(1)}%`,
        });
      }

      if (lowStock.length > 0) {
        insights.push({
          category: "inventory",
          severity: "danger",
          title: `${lowStock.length} bahan stok rendah`,
          description: `Segera restock: ${lowStock.map((i) => i.name).join(", ")}.`,
          metric: `${lowStock.length} item`,
        });
      } else {
        insights.push({
          category: "inventory",
          severity: "success",
          title: "Stok bahan baku aman",
          description: "Semua bahan dalam level stok yang cukup.",
          metric: "OK",
        });
      }

      if (txCount < 10) {
        insights.push({
          category: "growth",
          severity: "warning",
          title: "Volume transaksi masih rendah",
          description: "Tingkatkan traffic dengan promosi sosial media atau program loyalitas.",
          metric: `${txCount} transaksi`,
        }); // Changed from "danger" to "warning"
      }

      aiInsights = {
        summary: `Bisnis mencatat revenue Rp ${totalRevenue.toLocaleString("id-ID")} dengan margin ${margin.toFixed(1)}% dari ${txCount} transaksi bulan ini.`,
        insights,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalProfit,
        margin: Math.round(margin * 100) / 100,
        summary: aiInsights.summary || "",
        insights: aiInsights.insights || [],
        isAI: !!aiInsights.summary,
      },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Insight API error:", error);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}

function formatShort(val: number) {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}jt`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}rb`;
  return val.toLocaleString("id-ID");
}

// ─── POST: Per-chart AI explanation ──────────────────────────────────
const SECTION_PROMPTS: Record<string, string> = {
  revenue: `Analisis tren pendapatan harian UMKM ini. Jelaskan pola yang terlihat, hari-hari puncak penjualan, rata-rata harian, dan berikan saran bagaimana meningkatkan pendapatan.`,
  growth: `Analisis pertumbuhan bisnis UMKM ini dari bulan ke bulan. Jelaskan apakah bisnis tumbuh, stagnasi, atau menurun. Bandingkan pendapatan dan laba antar periode. Berikan saran strategis.`,
  products: `Analisis performa produk UMKM ini. Jelaskan produk mana yang paling laris, paling menguntungkan, dan mana yang perlu ditingkatkan. Berikan saran strategi produk.`,
  health: `Analisis kesehatan keuangan UMKM ini. Periksa rasio margin, arus kas, dan indikator keuangan. Berikan saran bagaimana memperbaiki kesehatan keuangan bisnis.`,
  waste: `Analisis data limbah/waste produk pada UMKM ini. Jelaskan produk mana yang paling banyak terbuang dan berikan rekomendasi pengelolaan stok yang lebih baik.`,
  kasbon: `Analisis data kasbon (piutang) UMKM ini. Jelaskan status utang pelanggan dan berikan saran pengelolaan piutang yang lebih baik.`,
  forecast: `Analisis data prediksi penjualan UMKM ini. Jelaskan tren yang diprediksi dan berikan saran strategi berdasarkan hasil prediksi.`,
};

export async function POST(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();
    const { section, data } = body as { section: string; data: unknown };

    if (!section || !data) {
      return NextResponse.json({ error: "section and data required" }, { status: 400 });
    }

    const sectionPrompt = SECTION_PROMPTS[section] || SECTION_PROMPTS.revenue;
    const dataStr = typeof data === "string" ? data : JSON.stringify(data, null, 2);

    const prompt = `${sectionPrompt}

Berikut data yang perlu dianalisis:
${dataStr}

PENTING:
- Jawab SELURUHNYA dalam Bahasa Indonesia
- Gunakan format yang ringkas (maksimal 3-4 paragraf)
- Sertakan angka-angka penting
- Akhiri dengan 2-3 saran konkret
- Gunakan format Rp untuk mata uang (contoh: Rp 500.000)`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah konsultan bisnis AI khusus UMKM Indonesia. Berikan analisis singkat dan actionable dalam Bahasa Indonesia.",
        },
        { role: "user", content: prompt },
      ],
      model: GROQ_MODELS.text.primary,
      temperature: 0.5,
      max_tokens: 800,
    });

    const insight = completion.choices[0]?.message?.content || "Tidak dapat menghasilkan analisis saat ini.";

    return NextResponse.json({ success: true, insight });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[AI Chart Insight] Error:", error);
    return NextResponse.json({ error: "Gagal menghasilkan analisis", details: String(error) }, { status: 500 });
  }
}
