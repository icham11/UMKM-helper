/**
 * RAG Vector Store — Indexing & Semantic Search
 *
 * Responsibilities:
 * 1. Build text chunks from business data (products, ingredients, sales, etc.)
 * 2. Generate embeddings via Gemini and store in PostgreSQL/pgvector
 * 3. Semantic similarity search using cosine distance
 */

import prisma from "@/lib/prisma";
import {
  generateQueryEmbedding,
  generateEmbeddingsBatch,
} from "./embedding";

// ==================== TYPES ====================

interface DocumentChunk {
  content: string;
  sourceType: string;
  sourceId: number | null;
  metadata: Record<string, unknown>;
  chunkIndex: number;
}

export interface SearchResult {
  id: number;
  content: string;
  sourceType: string;
  sourceId: number | null;
  metadata: Record<string, unknown>;
  similarity: number;
}

export interface IndexStatus {
  indexed: boolean;
  documentCount: number;
  lastUpdated: Date | null;
}

// ==================== BUILD DOCUMENT CHUNKS ====================

/**
 * Extracts all business data and splits into semantic chunks for embedding
 */
async function buildBusinessChunks(businessId: number): Promise<DocumentChunk[]> {
  const chunks: DocumentChunk[] = [];

  // ─── 1. Products ───
  const products = await prisma.product.findMany({
    where: { businessId },
    include: {
      category: true,
      recipes: { include: { ingredient: true } },
    },
  });

  for (const product of products) {
    const recipeLines = product.recipes.map(
      (r) => `  - ${r.ingredient.name}: ${Number(r.quantity)} ${r.ingredient.unit}`
    );

    chunks.push({
      content: [
        `[Produk] ${product.name}`,
        `Kategori: ${product.category?.name || "Tanpa kategori"}`,
        `Harga jual: Rp${Number(product.sellingPrice).toLocaleString("id-ID")}`,
        `Status: ${product.isActive ? "Aktif dijual" : "Nonaktif"}`,
        recipeLines.length > 0
          ? `Komposisi resep:\n${recipeLines.join("\n")}`
          : "Belum memiliki resep",
      ].join("\n"),
      sourceType: "product",
      sourceId: product.id,
      metadata: {
        name: product.name,
        price: Number(product.sellingPrice),
        category: product.category?.name,
        active: product.isActive,
      },
      chunkIndex: 0,
    });
  }

  // ─── 2. Ingredients + stock ───
  const ingredients = await prisma.ingredient.findMany({
    where: { businessId },
    include: {
      inventoryBatches: {
        where: { remainingQty: { gt: 0 } },
        orderBy: { receivedAt: "desc" },
      },
    },
  });

  for (const ing of ingredients) {
    const totalStock = ing.inventoryBatches.reduce(
      (sum, b) => sum + Number(b.remainingQty),
      0
    );
    const avgCost =
      ing.inventoryBatches.length > 0
        ? ing.inventoryBatches.reduce((s, b) => s + Number(b.costPerUnit), 0) /
          ing.inventoryBatches.length
        : 0;
    const nearestExpiry = ing.inventoryBatches
      .filter((b) => b.expirationDate)
      .sort(
        (a, b) =>
          new Date(a.expirationDate!).getTime() -
          new Date(b.expirationDate!).getTime()
      )[0]?.expirationDate;

    const status =
      totalStock <= 0
        ? "HABIS"
        : totalStock <= ing.minStock
          ? "KRITIS — di bawah minimum"
          : "Stok cukup";

    chunks.push({
      content: [
        `[Bahan Baku] ${ing.name}`,
        `Satuan: ${ing.unit}`,
        `Stok saat ini: ${totalStock} ${ing.unit} (min: ${ing.minStock})`,
        `Status stok: ${status}`,
        `Harga beli rata-rata: Rp${avgCost.toLocaleString("id-ID")} per ${ing.unit}`,
        `Batch tersedia: ${ing.inventoryBatches.length}`,
        nearestExpiry
          ? `Kedaluwarsa terdekat: ${new Date(nearestExpiry).toLocaleDateString("id-ID")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
      sourceType: "ingredient",
      sourceId: ing.id,
      metadata: {
        name: ing.name,
        unit: ing.unit,
        totalStock,
        minStock: ing.minStock,
        status,
        avgCost,
      },
      chunkIndex: 0,
    });
  }

  // ─── 3. Sales (weekly buckets — last 90 days) ───
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const sales = await prisma.sale.findMany({
    where: { businessId, createdAt: { gte: ninetyDaysAgo } },
    include: { saleItems: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Bucket by week
  const weeks: Record<
    string,
    { revenue: number; cost: number; count: number; items: Record<string, { qty: number; rev: number }>; paymentMethods: Record<string, number> }
  > = {};

  for (const sale of sales) {
    const wk = weekKey(sale.createdAt);
    if (!weeks[wk]) weeks[wk] = { revenue: 0, cost: 0, count: 0, items: {}, paymentMethods: {} };
    weeks[wk].revenue += Number(sale.totalRevenue);
    weeks[wk].cost += Number(sale.totalCost);
    weeks[wk].count++;
    weeks[wk].paymentMethods[sale.paymentMethod] = (weeks[wk].paymentMethods[sale.paymentMethod] || 0) + 1;

    for (const item of sale.saleItems) {
      const n = item.product.name;
      if (!weeks[wk].items[n]) weeks[wk].items[n] = { qty: 0, rev: 0 };
      weeks[wk].items[n].qty += item.quantity;
      weeks[wk].items[n].rev += Number(item.priceAtSale) * item.quantity;
    }
  }

  let ci = 0;
  for (const [wk, data] of Object.entries(weeks)) {
    const topItems = Object.entries(data.items)
      .sort(([, a], [, b]) => b.qty - a.qty)
      .slice(0, 10)
      .map(([n, i]) => `${n} (${i.qty} pcs, Rp${i.rev.toLocaleString("id-ID")})`)
      .join(", ");
    const profit = data.revenue - data.cost;
    const margin = data.revenue > 0 ? ((profit / data.revenue) * 100).toFixed(1) : "0";
    const pmBreakdown = Object.entries(data.paymentMethods)
      .map(([m, c]) => `${m}: ${c}`)
      .join(", ");

    chunks.push({
      content: [
        `[Penjualan Minggu ${wk}]`,
        `Jumlah transaksi: ${data.count}`,
        `Pendapatan: Rp${data.revenue.toLocaleString("id-ID")}`,
        `Biaya bahan: Rp${data.cost.toLocaleString("id-ID")}`,
        `Profit: Rp${profit.toLocaleString("id-ID")} (margin ${margin}%)`,
        `Metode pembayaran: ${pmBreakdown}`,
        `Produk terlaris: ${topItems || "—"}`,
      ].join("\n"),
      sourceType: "sale",
      sourceId: null,
      metadata: { weekStart: wk, revenue: data.revenue, cost: data.cost, profit, count: data.count, paymentMethods: data.paymentMethods },
      chunkIndex: ci++,
    });
  }

  // ─── 3a-bis. Product breakdown by payment method (all 90 days) ───
  const productsByPayment: Record<string, Record<string, { qty: number; rev: number }>> = {};
  for (const sale of sales) {
    const pm = sale.paymentMethod;
    if (!productsByPayment[pm]) productsByPayment[pm] = {};
    for (const si of sale.saleItems) {
      const pName = si.product.name;
      if (!productsByPayment[pm][pName]) productsByPayment[pm][pName] = { qty: 0, rev: 0 };
      productsByPayment[pm][pName].qty += si.quantity;
      productsByPayment[pm][pName].rev += Number(si.priceAtSale) * si.quantity;
    }
  }

  const pmNames = Object.keys(productsByPayment);
  if (pmNames.length > 1) {
    const pmLines: string[] = [];
    for (const pm of pmNames) {
      const sorted = Object.entries(productsByPayment[pm])
        .sort(([, a], [, b]) => b.qty - a.qty)
        .slice(0, 8);
      if (sorted.length > 0) {
        pmLines.push(`Metode ${pm}:`);
        for (const [name, data] of sorted) {
          pmLines.push(`  ${name}: ${data.qty} pcs (Rp${data.rev.toLocaleString("id-ID")})`);
        }
      }
    }

    chunks.push({
      content: [
        `[Produk Terlaris per Metode Pembayaran — 90 Hari]`,
        ...pmLines,
      ].join("\n"),
      sourceType: "sale",
      sourceId: null,
      metadata: { paymentMethods: pmNames },
      chunkIndex: ci++,
    });
  }

  // ─── 3b. Recent individual transactions (last 7 days for detailed context) ───
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentSales = sales.filter((s) => new Date(s.createdAt) >= sevenDaysAgo);

  // Chunk every 5 transactions together
  for (let i = 0; i < recentSales.length; i += 5) {
    const batch = recentSales.slice(i, i + 5);
    const lines = batch.map((s) => {
      const items = s.saleItems.map((si) => `${si.product.name} x${si.quantity}`).join(", ");
      return [
        `  ${s.transactionNumber} — ${new Date(s.createdAt).toLocaleString("id-ID")}`,
        `  Item: ${items}`,
        `  Total: Rp${Number(s.totalRevenue).toLocaleString("id-ID")} | Metode: ${s.paymentMethod} | Status: ${s.paymentStatus}`,
        s.customerName ? `  Pelanggan: ${s.customerName}` : "",
      ].filter(Boolean).join("\n");
    });

    chunks.push({
      content: [
        `[Transaksi Terbaru — ${new Date(batch[0].createdAt).toLocaleDateString("id-ID")}]`,
        ...lines,
      ].join("\n"),
      sourceType: "sale_detail",
      sourceId: null,
      metadata: {
        count: batch.length,
        dateRange: `${new Date(batch[batch.length - 1].createdAt).toLocaleDateString("id-ID")} - ${new Date(batch[0].createdAt).toLocaleDateString("id-ID")}`,
      },
      chunkIndex: ci++,
    });
  }

  // ─── 3c. Kasbon / Piutang (Debts) ───
  const debts = await prisma.debt.findMany({
    where: { businessId },
    include: {
      sale: {
        select: {
          transactionNumber: true,
          createdAt: true,
          saleItems: {
            include: { product: { select: { id: true, name: true } } },
          },
        },
      },
      payments: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (debts.length > 0) {
    // Summary chunk
    const totalDebt = debts.reduce((s, d) => s + Number(d.totalAmount), 0);
    const totalPaid = debts.reduce((s, d) => s + Number(d.paidAmount), 0);
    const totalRemaining = totalDebt - totalPaid;
    const unpaidCount = debts.filter((d) => d.status !== "Paid").length;
    const overdueCount = debts.filter(
      (d) => d.status !== "Paid" && d.dueDate && new Date(d.dueDate) < new Date()
    ).length;

    // Group by customer
    const byCustomer: Record<string, { total: number; remaining: number; count: number }> = {};
    for (const d of debts) {
      const k = d.customerName;
      if (!byCustomer[k]) byCustomer[k] = { total: 0, remaining: 0, count: 0 };
      byCustomer[k].total += Number(d.totalAmount);
      byCustomer[k].remaining += Number(d.totalAmount) - Number(d.paidAmount);
      byCustomer[k].count++;
    }
    const topDebtors = Object.entries(byCustomer)
      .sort(([, a], [, b]) => b.remaining - a.remaining)
      .slice(0, 10)
      .map(([name, d]) => `${name}: Rp${d.remaining.toLocaleString("id-ID")} (${d.count} kasbon)`)
      .join(", ");

    chunks.push({
      content: [
        `[Kasbon / Piutang — Ringkasan]`,
        `Total kasbon: ${debts.length} transaksi`,
        `Total nilai kasbon: Rp${totalDebt.toLocaleString("id-ID")}`,
        `Sudah dibayar: Rp${totalPaid.toLocaleString("id-ID")}`,
        `Sisa piutang: Rp${totalRemaining.toLocaleString("id-ID")}`,
        `Belum lunas: ${unpaidCount} kasbon`,
        `Jatuh tempo: ${overdueCount} kasbon`,
        `Debitur terbesar: ${topDebtors || "—"}`,
      ].join("\n"),
      sourceType: "debt",
      sourceId: null,
      metadata: { totalDebt, totalPaid, totalRemaining, unpaidCount, overdueCount },
      chunkIndex: 0,
    });

    // ── Produk paling sering dikasbon ──
    const kasbonProducts: Record<string, { qty: number; revenue: number; txCount: number }> = {};
    const kasbonByCustomerProduct: Record<string, Record<string, number>> = {};

    for (const d of debts) {
      for (const si of d.sale.saleItems) {
        const pName = si.product.name;
        if (!kasbonProducts[pName]) kasbonProducts[pName] = { qty: 0, revenue: 0, txCount: 0 };
        kasbonProducts[pName].qty += si.quantity;
        kasbonProducts[pName].revenue += Number(si.priceAtSale) * si.quantity;
        kasbonProducts[pName].txCount++;

        // Track per customer too
        const custKey = d.customerName;
        if (!kasbonByCustomerProduct[custKey]) kasbonByCustomerProduct[custKey] = {};
        kasbonByCustomerProduct[custKey][pName] = (kasbonByCustomerProduct[custKey][pName] || 0) + si.quantity;
      }
    }

    const sortedKasbonProducts = Object.entries(kasbonProducts)
      .sort(([, a], [, b]) => b.qty - a.qty);

    if (sortedKasbonProducts.length > 0) {
      const productLines = sortedKasbonProducts
        .slice(0, 15)
        .map(([name, data], i) =>
          `  ${i + 1}. ${name}: ${data.qty} pcs (${data.txCount} transaksi kasbon, total Rp${data.revenue.toLocaleString("id-ID")})`
        );

      // Customer favorites
      const customerFavLines = Object.entries(kasbonByCustomerProduct)
        .slice(0, 10)
        .map(([cust, prods]) => {
          const topProd = Object.entries(prods).sort(([, a], [, b]) => b - a)[0];
          return topProd ? `  ${cust} → sering kasbon: ${topProd[0]} (${topProd[1]} pcs)` : null;
        })
        .filter(Boolean);

      chunks.push({
        content: [
          `[Produk Paling Sering Dikasbon]`,
          `Daftar produk yang paling banyak dibeli dengan kasbon:`,
          ...productLines,
          ``,
          `Preferensi kasbon per pelanggan:`,
          ...customerFavLines,
        ].join("\n"),
        sourceType: "debt",
        sourceId: null,
        metadata: {
          topProduct: sortedKasbonProducts[0]?.[0],
          topProductQty: sortedKasbonProducts[0]?.[1]?.qty,
          uniqueProducts: sortedKasbonProducts.length,
        },
        chunkIndex: 1,
      });
    }

    // Individual overdue debts (with items)
    const overdueDebts = debts.filter(
      (d) => d.status !== "Paid" && d.dueDate && new Date(d.dueDate) < new Date()
    );
    if (overdueDebts.length > 0) {
      const lines = overdueDebts.slice(0, 15).map((d) => {
        const daysLate = Math.floor(
          (new Date().getTime() - new Date(d.dueDate!).getTime()) / (1000 * 60 * 60 * 24)
        );
        const items = d.sale.saleItems.map((si) => `${si.product.name} x${si.quantity}`).join(", ");
        return `  ${d.customerName}: Rp${(Number(d.totalAmount) - Number(d.paidAmount)).toLocaleString("id-ID")} sisa — lewat ${daysLate} hari — item: ${items} (${d.sale.transactionNumber})`;
      });

      chunks.push({
        content: [
          `[Kasbon Jatuh Tempo]`,
          `Ada ${overdueDebts.length} kasbon yang sudah melewati jatuh tempo:`,
          ...lines,
        ].join("\n"),
        sourceType: "debt",
        sourceId: null,
        metadata: { overdueCount: overdueDebts.length },
        chunkIndex: 2,
      });
    }

    // Active unpaid debts detail (with items)
    const activeDebts = debts.filter((d) => d.status !== "Paid").slice(0, 20);
    if (activeDebts.length > 0) {
      const lines = activeDebts.map((d) => {
        const remaining = Number(d.totalAmount) - Number(d.paidAmount);
        const dueDateStr = d.dueDate
          ? new Date(d.dueDate).toLocaleDateString("id-ID")
          : "tidak ditentukan";
        const items = d.sale.saleItems.map((si) => `${si.product.name} x${si.quantity}`).join(", ");
        return `  ${d.customerName} (${d.customerPhone || "no HP"}) — sisa Rp${remaining.toLocaleString("id-ID")} — jatuh tempo: ${dueDateStr} — item: ${items} — status: ${d.status}`;
      });

      chunks.push({
        content: [
          `[Kasbon Aktif — Belum Lunas]`,
          ...lines,
        ].join("\n"),
        sourceType: "debt",
        sourceId: null,
        metadata: { activeCount: activeDebts.length },
        chunkIndex: 3,
      });
    }
  }

  // ─── 4. Business metrics (last 30 days summary) ───
  const thirtyAgo = new Date();
  thirtyAgo.setDate(thirtyAgo.getDate() - 30);

  const metrics = await prisma.businessMetrics.findMany({
    where: { businessId, date: { gte: thirtyAgo } },
    orderBy: { date: "desc" },
  });

  if (metrics.length > 0) {
    const totRev = metrics.reduce((s, m) => s + Number(m.totalRevenue), 0);
    const totProfit = metrics.reduce((s, m) => s + Number(m.totalProfit), 0);
    const avgMargin = metrics.reduce((s, m) => s + m.marginAvg, 0) / metrics.length;
    const avgGrowth = metrics.reduce((s, m) => s + m.growthRate, 0) / metrics.length;

    chunks.push({
      content: [
        `[Metrik Bisnis — 30 Hari Terakhir]`,
        `Total pendapatan: Rp${totRev.toLocaleString("id-ID")}`,
        `Total profit: Rp${totProfit.toLocaleString("id-ID")}`,
        `Rata-rata margin: ${avgMargin.toFixed(1)}%`,
        `Rata-rata growth rate: ${avgGrowth.toFixed(1)}%`,
        `Hari yang tercatat: ${metrics.length}`,
        `Pendapatan tertinggi: Rp${Math.max(...metrics.map((m) => Number(m.totalRevenue))).toLocaleString("id-ID")}`,
        `Pendapatan terendah: Rp${Math.min(...metrics.map((m) => Number(m.totalRevenue))).toLocaleString("id-ID")}`,
      ].join("\n"),
      sourceType: "metric",
      sourceId: null,
      metadata: { totRev, totProfit, avgMargin, avgGrowth, days: metrics.length },
      chunkIndex: 0,
    });
  }

  // ─── 5. Health scores ───
  const healthScores = await prisma.businessHealthScores.findMany({
    where: { businessId },
    orderBy: { date: "desc" },
    take: 7,
  });

  if (healthScores.length > 0) {
    const latest = healthScores[0];
    chunks.push({
      content: [
        `[Skor Kesehatan Bisnis — ${new Date(latest.date).toLocaleDateString("id-ID")}]`,
        `Revenue Score: ${latest.revenueScore.toFixed(1)}/100`,
        `Profit Score: ${latest.profitScore.toFixed(1)}/100`,
        `Waste Score: ${latest.wasteScore.toFixed(1)}/100`,
        `Stability Score: ${latest.stabilityScore.toFixed(1)}/100`,
        `Overall Score: ${latest.overallScore.toFixed(1)}/100`,
        `Klasifikasi: ${latest.classification || "—"}`,
        `Tren 7 hari: ${healthScores.map((h) => h.overallScore.toFixed(0)).join(" → ")}`,
      ].join("\n"),
      sourceType: "health",
      sourceId: null,
      metadata: {
        overall: latest.overallScore,
        classification: latest.classification,
      },
      chunkIndex: 0,
    });
  }

  // ─── 6. Cross-reference recipes ───
  const recipes = await prisma.recipe.findMany({
    where: { product: { businessId } },
    include: { product: true, ingredient: true },
  });

  const byProduct: Record<string, { id: number; items: string[] }> = {};
  for (const r of recipes) {
    const k = r.product.name;
    if (!byProduct[k]) byProduct[k] = { id: r.productId, items: [] };
    byProduct[k].items.push(
      `${r.ingredient.name} (${Number(r.quantity)} ${r.ingredient.unit})`
    );
  }

  for (const [pName, data] of Object.entries(byProduct)) {
    chunks.push({
      content: [
        `[Resep] ${pName}`,
        `Bahan-bahan: ${data.items.join(", ")}`,
        `Total jenis bahan: ${data.items.length}`,
      ].join("\n"),
      sourceType: "recipe",
      sourceId: data.id,
      metadata: { productName: pName, ingredientCount: data.items.length },
      chunkIndex: 0,
    });
  }

  return chunks;
}

// ==================== INDEXING ====================

/**
 * Index all business data into the vector store.
 * Deletes existing docs and replaces with fresh embeddings.
 */
export async function indexBusinessDocuments(
  businessId: number
): Promise<{ indexed: number; elapsed: number }> {
  const t0 = Date.now();
  console.log(`[RAG] Starting indexing for business ${businessId}...`);

  // 1. Build chunks
  const chunks = await buildBusinessChunks(businessId);
  if (chunks.length === 0) {
    console.log("[RAG] No data to index.");
    return { indexed: 0, elapsed: Date.now() - t0 };
  }
  console.log(`[RAG] Built ${chunks.length} document chunks`);

  // 2. Generate embeddings via Gemini
  const texts = chunks.map((c) => c.content);
  console.log(`[RAG] Generating ${texts.length} embeddings via Gemini...`);
  const embeddings = await generateEmbeddingsBatch(texts);
  console.log(`[RAG] Got ${embeddings.length} embeddings`);

  // 3. Delete old documents
  await prisma.$executeRawUnsafe(
    `DELETE FROM "BusinessDocument" WHERE "businessId" = $1`,
    businessId
  );

  // 4. Insert new documents with embeddings
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const vecStr = `[${embeddings[i].join(",")}]`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "BusinessDocument"
         ("businessId", "content", "embedding", "sourceType", "sourceId", "metadata", "chunkIndex", "createdAt", "updatedAt")
       VALUES ($1, $2, $3::vector, $4, $5, $6::jsonb, $7, NOW(), NOW())`,
      businessId,
      chunk.content,
      vecStr,
      chunk.sourceType,
      chunk.sourceId,
      JSON.stringify(chunk.metadata),
      chunk.chunkIndex
    );
  }

  const elapsed = Date.now() - t0;
  console.log(`[RAG] ✅ Indexed ${chunks.length} docs in ${elapsed}ms`);
  return { indexed: chunks.length, elapsed };
}

// ==================== SEMANTIC SEARCH ====================

/**
 * Semantic search — find the most relevant documents for a query
 */
export async function searchDocuments(
  businessId: number,
  query: string,
  options: { topK?: number; sourceTypes?: string[]; minSimilarity?: number } = {}
): Promise<SearchResult[]> {
  const { topK = 8, sourceTypes, minSimilarity = 0.25 } = options;

  // 1. Embed the query (uses RETRIEVAL_QUERY task type)
  const queryVec = await generateQueryEmbedding(query);
  const vecStr = `[${queryVec.join(",")}]`;

  // 2. Build SQL
  let sql = `
    SELECT
      id,
      content,
      "sourceType",
      "sourceId",
      metadata,
      1 - (embedding <=> $1::vector) AS similarity
    FROM "BusinessDocument"
    WHERE "businessId" = $2
      AND embedding IS NOT NULL
      AND 1 - (embedding <=> $1::vector) >= $3
  `;
  const params: unknown[] = [vecStr, businessId, minSimilarity];

  if (sourceTypes && sourceTypes.length > 0) {
    sql += ` AND "sourceType" = ANY($4::text[])`;
    params.push(sourceTypes);
  }

  sql += ` ORDER BY similarity DESC LIMIT $${params.length + 1}`;
  params.push(topK);

  // 3. Execute
  const rows: SearchResult[] = await prisma.$queryRawUnsafe(sql, ...params);

  return rows.map((r) => ({
    ...r,
    similarity: Number(r.similarity),
    metadata: (r.metadata || {}) as Record<string, unknown>,
  }));
}

/**
 * Search and format results as context string for the LLM
 */
export async function getRelevantContext(
  businessId: number,
  query: string,
  options?: { topK?: number; sourceTypes?: string[]; minSimilarity?: number }
): Promise<{ context: string; sources: SearchResult[] }> {
  const results = await searchDocuments(businessId, query, options);

  if (results.length === 0) {
    return { context: "Tidak ada data bisnis relevan yang ditemukan di vector store.", sources: [] };
  }

  const labels: Record<string, string> = {
    product: "📦 Produk",
    ingredient: "🧂 Bahan Baku",
    sale: "💰 Penjualan",
    sale_detail: "🧾 Transaksi Detail",
    recipe: "📋 Resep",
    metric: "📊 Metrik",
    health: "🏥 Kesehatan Bisnis",
    debt: "📒 Kasbon/Piutang",
  };

  const parts = results.map((r, i) => {
    const label = labels[r.sourceType] || r.sourceType;
    return `--- ${label} #${i + 1} (relevansi ${(r.similarity * 100).toFixed(0)}%) ---\n${r.content}`;
  });

  return { context: parts.join("\n\n"), sources: results };
}

// ==================== STATUS ====================

export async function getIndexStatus(businessId: number): Promise<IndexStatus> {
  const rows = await prisma.$queryRawUnsafe<{ count: bigint; last_updated: Date | null }[]>(
    `SELECT COUNT(*) as count, MAX("updatedAt") as last_updated FROM "BusinessDocument" WHERE "businessId" = $1`,
    businessId
  );
  const count = Number(rows[0]?.count || 0);
  return {
    indexed: count > 0,
    documentCount: count,
    lastUpdated: rows[0]?.last_updated || null,
  };
}

// ==================== HELPERS ====================

function weekKey(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)); // Monday
  return d.toISOString().split("T")[0];
}



