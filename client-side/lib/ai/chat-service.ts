import { groq, GROQ_MODELS } from "@/lib/groq";
import prisma from "@/lib/prisma";
import { getRelevantContext, getIndexStatus, indexBusinessDocuments } from "@/lib/ai/rag-store";

// ===================== TYPES =====================

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatContext {
  businessId: number;
  sessionId?: number;
  contextType?: string;
}

export interface BusinessDataContext {
  businessName: string;
  products: { name: string; sellingPrice: number; category?: string }[];
  recentSales: {
    date: string;
    totalRevenue: number;
    totalCost: number;
    items: { productName: string; quantity: number }[];
  }[];
  ingredients: {
    name: string;
    unit: string;
    minStock: number;
    currentStock: number;
    batches: { remainingQty: number; expirationDate?: string | null }[];
  }[];
  metrics?: {
    totalRevenue: number;
    totalProfit: number;
    marginAvg: number;
    growthRate: number;
  } | null;
  recipes: {
    productName: string;
    ingredientName: string;
    quantity: number;
    unit: string;
  }[];
}

// ===================== SYSTEM PROMPT =====================

const CHAT_SYSTEM_PROMPT = `Kamu adalah AI Business Assistant untuk UMKM (Usaha Mikro Kecil Menengah) Indonesia.
Kamu membantu pemilik usaha kecil dengan analisis bisnis, saran strategi, dan insight berbasis data.

KEMAMPUAN kamu:
- Analisis penjualan dan tren pendapatan
- Monitoring stok dan prediksi kehabisan bahan
- Rekomendasi produk dan optimasi menu
- Strategi harga dan margin profit
- Tips manajemen bisnis UMKM
- Analisis performa produk
- Prediksi demand dan perencanaan produksi

ATURAN:
1. Jawab dalam Bahasa Indonesia yang ramah dan mudah dipahami
2. Gunakan DATA BISNIS yang diberikan di bawah untuk memberikan insight SPESIFIK
3. Data di bawah adalah hasil pencarian semantik — hanya data yang RELEVAN dengan pertanyaan user
4. Berikan saran yang actionable dan praktis untuk UMKM
5. Gunakan format markdown yang rapi: tabel, bold, heading, numbered list
6. Selalu sertakan angka dan persentase jika data tersedia
7. Jika data tidak cukup, katakan secara jujur lalu berikan saran umum
8. Jangan mengarang data yang tidak ada dalam konteks
9. Gunakan emoji secukupnya untuk membuat respons lebih engaging`;

// ===================== FETCH BUSINESS DATA =====================

export async function fetchBusinessContext(businessId: number): Promise<BusinessDataContext> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const [business, products, sales, ingredients, metrics, recipes] = await Promise.all([
    prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true },
    }),

    prisma.product.findMany({
      where: { businessId, isActive: true },
      select: {
        name: true,
        sellingPrice: true,
        category: { select: { name: true } },
      },
      take: 50,
    }),

    prisma.sale.findMany({
      where: {
        businessId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        createdAt: true,
        totalRevenue: true,
        totalCost: true,
        saleItems: {
          select: {
            quantity: true,
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),

    prisma.ingredient.findMany({
      where: { businessId },
      select: {
        name: true,
        unit: true,
        minStock: true,
        inventoryBatches: {
          select: {
            remainingQty: true,
            expirationDate: true,
          },
          where: { remainingQty: { gt: 0 } },
        },
      },
    }),

    prisma.businessMetrics.findFirst({
      where: {
        businessId,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: "desc" },
      select: {
        totalRevenue: true,
        totalProfit: true,
        marginAvg: true,
        growthRate: true,
      },
    }),

    prisma.recipe.findMany({
      where: { product: { businessId } },
      select: {
        quantity: true,
        product: { select: { name: true } },
        ingredient: { select: { name: true, unit: true } },
      },
      take: 100,
    }),
  ]);

  return {
    businessName: business?.name || "Unknown",
    products: products.map((p) => ({
      name: p.name,
      sellingPrice: Number(p.sellingPrice),
      category: p.category?.name,
    })),
    recentSales: sales.map((s) => ({
      date: s.createdAt.toISOString(),
      totalRevenue: Number(s.totalRevenue),
      totalCost: Number(s.totalCost),
      items: s.saleItems.map((si) => ({
        productName: si.product.name,
        quantity: si.quantity,
      })),
    })),
    ingredients: ingredients.map((i) => ({
      name: i.name,
      unit: i.unit,
      minStock: i.minStock,
      currentStock: i.inventoryBatches.reduce(
        (sum, b) => sum + Number(b.remainingQty),
        0
      ),
      batches: i.inventoryBatches.map((b) => ({
        remainingQty: Number(b.remainingQty),
        expirationDate: b.expirationDate?.toISOString() || null,
      })),
    })),
    metrics: metrics
      ? {
          totalRevenue: Number(metrics.totalRevenue),
          totalProfit: Number(metrics.totalProfit),
          marginAvg: metrics.marginAvg,
          growthRate: metrics.growthRate,
        }
      : null,
    recipes: recipes.map((r) => ({
      productName: r.product.name,
      ingredientName: r.ingredient.name,
      quantity: Number(r.quantity),
      unit: r.ingredient.unit,
    })),
  };
}

// ===================== RAG CONTEXT BUILDER =====================

/**
 * Ensures business data is indexed in the vector store.
 * Auto-indexes if not yet done, re-indexes if data is stale (>1 hour).
 */
async function ensureRAGIndex(businessId: number): Promise<void> {
  try {
    const status = await getIndexStatus(businessId);
    if (!status.indexed) {
      console.log(`[RAG] Business ${businessId} not indexed. Auto-indexing...`);
      await indexBusinessDocuments(businessId);
    } else if (status.lastUpdated) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (status.lastUpdated < oneHourAgo) {
        console.log(`[RAG] Re-indexing business ${businessId} (stale data)...`);
        // Run in background so we don't block the response
        indexBusinessDocuments(businessId).catch((e) =>
          console.error("[RAG] Background re-index failed:", e)
        );
      }
    }
  } catch (err) {
    console.warn("[RAG] Index check failed, will use fallback context:", err);
  }
}

/**
 * Build context prompt using RAG semantic search.
 * Falls back to the old dump-all approach if RAG fails.
 */
async function buildRAGContextPrompt(
  businessId: number,
  userMessage: string
): Promise<{ prompt: string; ragUsed: boolean; sourceCount: number; sources: { sourceType: string; similarity: number; content: string }[] }> {
  try {
    await ensureRAGIndex(businessId);

    const { context, sources } = await getRelevantContext(businessId, userMessage, {
      topK: 10,
      minSimilarity: 0.2,
    });

    if (sources.length > 0) {
      console.log(
        `[RAG] Found ${sources.length} relevant docs (similarity: ${sources.map((s) => s.similarity.toFixed(2)).join(", ")})`
      );

      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { name: true },
      });

      const prompt = `
DATA BISNIS "${business?.name || "UMKM"}" (via RAG Semantic Search — ${sources.length} dokumen relevan):

${context}
`;
      const sourceRefs = sources.map((s) => ({
        sourceType: s.sourceType,
        similarity: s.similarity,
        content: s.content.slice(0, 100),
      }));
      return { prompt, ragUsed: true, sourceCount: sources.length, sources: sourceRefs };
    }
  } catch (err) {
    console.warn("[RAG] Semantic search failed, falling back to dump-all:", err);
  }

  // Fallback: use the old approach
  const businessData = await fetchBusinessContext(businessId);
  const prompt = buildContextPrompt(businessData);
  return { prompt, ragUsed: false, sourceCount: 0, sources: [] };
}

// ===================== CHAT COMPLETION =====================

export async function chatWithAssistant(
  messages: ChatMessage[],
  context: ChatContext
): Promise<string> {
  // Get the user's latest message for RAG search
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const searchQuery = lastUserMsg?.content || messages[messages.length - 1]?.content || "";

  // Build context using RAG semantic search
  const { prompt: contextPrompt, ragUsed, sourceCount } = await buildRAGContextPrompt(
    context.businessId,
    searchQuery
  );
  console.log(`🤖 AI Chat [RAG=${ragUsed}, sources=${sourceCount}]`);

  const systemMessage: ChatMessage = {
    role: "system",
    content: CHAT_SYSTEM_PROMPT + "\n\n" + contextPrompt,
  };

  const allMessages = [systemMessage, ...messages.slice(-10)]; // Keep last 10 messages for context

  const modelConfig = GROQ_MODELS.text;
  let selectedModel = modelConfig.primary;

  try {
    console.log(`🤖 AI Chat using model: ${selectedModel}`);

    const completion = await groq.chat.completions.create({
      messages: allMessages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      model: selectedModel,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const response = completion.choices[0]?.message?.content || "Maaf, saya tidak bisa memberikan respons saat ini.";

    // Persist messages
    try {
      await persistMessages(context.businessId, context.sessionId, messages[messages.length - 1], {
        role: "assistant",
        content: response,
      }, context.contextType);
    } catch (persistError) {
      console.warn("Failed to persist chat messages:", persistError);
    }

    return response;
  } catch {
    // Try fallback model
    console.warn(`⚠️ Primary chat model failed, trying fallback: ${modelConfig.fallback}`);
    selectedModel = modelConfig.fallback;

    try {
      const completion = await groq.chat.completions.create({
        messages: allMessages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
        model: selectedModel,
        temperature: 0.7,
        max_tokens: 2048,
      });

      return completion.choices[0]?.message?.content || "Maaf, saya tidak bisa memberikan respons saat ini.";
    } catch (fallbackError) {
      const msg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      console.error("❌ AI Chat Error:", msg);
      throw new Error(`AI Chat failed: ${msg}`);
    }
  }
}

// ===================== STREAMING CHAT =====================

export async function streamChatWithAssistant(
  messages: ChatMessage[],
  context: ChatContext
): Promise<ReadableStream<Uint8Array>> {
  // Get the user's latest message for RAG search
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const searchQuery = lastUserMsg?.content || messages[messages.length - 1]?.content || "";

  // Build context using RAG semantic search
  const { prompt: contextPrompt, ragUsed, sourceCount, sources } = await buildRAGContextPrompt(
    context.businessId,
    searchQuery
  );
  console.log(`🤖 AI Stream [RAG=${ragUsed}, sources=${sourceCount}]`);

  const systemMessage: ChatMessage = {
    role: "system",
    content: CHAT_SYSTEM_PROMPT + "\n\n" + contextPrompt,
  };

  const allMessages = [systemMessage, ...messages.slice(-10)];
  const modelConfig = GROQ_MODELS.text;

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullResponse = "";

      // Send RAG sources as first SSE event so frontend can show badges
      if (sources.length > 0) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`)
        );
      }

      try {
        const stream = await groq.chat.completions.create({
          messages: allMessages.map((m) => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
          })),
          model: modelConfig.primary,
          temperature: 0.7,
          max_tokens: 2048,
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            fullResponse += content;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
          }
        }

        // Persist after streaming completes
        try {
          await persistMessages(context.businessId, context.sessionId, messages[messages.length - 1], {
            role: "assistant",
            content: fullResponse,
          }, context.contextType);
        } catch {
          console.warn("Failed to persist streamed messages");
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      } catch {
        // Try fallback
        console.warn("⚠️ Streaming primary failed, trying fallback...");
        try {
          const stream = await groq.chat.completions.create({
            messages: allMessages.map((m) => ({
              role: m.role as "user" | "assistant" | "system",
              content: m.content,
            })),
            model: modelConfig.fallback,
            temperature: 0.7,
            max_tokens: 2048,
            stream: true,
          });

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullResponse += content;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (fallbackError) {
          const msg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          controller.close();
        }
      }
    },
  });
}

// ===================== HELPERS =====================

function buildContextPrompt(data: BusinessDataContext): string {
  const lowStockItems = data.ingredients.filter((i) => i.currentStock <= i.minStock);
  const totalRev = data.recentSales.reduce((s, r) => s + r.totalRevenue, 0);
  const totalCost = data.recentSales.reduce((s, r) => s + r.totalCost, 0);

  // Aggregate top-selling products
  const productSales: Record<string, number> = {};
  data.recentSales.forEach((s) =>
    s.items.forEach((i) => {
      productSales[i.productName] = (productSales[i.productName] || 0) + i.quantity;
    })
  );
  const topProducts = Object.entries(productSales)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return `
DATA BISNIS "${data.businessName}" (30 hari terakhir):

📦 PRODUK AKTIF: ${data.products.length}
🏆 TOP SELLING:
${topProducts.map(([name, qty], i) => `${i + 1}. ${name} (${qty} terjual)`).join("\n") || "Belum ada data"}

💰 RINGKASAN KEUANGAN:
- Total Revenue: Rp${totalRev.toLocaleString("id-ID")}
- Total Cost: Rp${totalCost.toLocaleString("id-ID")}  
- Total Profit: Rp${(totalRev - totalCost).toLocaleString("id-ID")}
- Jumlah Transaksi: ${data.recentSales.length}
${data.recentSales.length > 0 ? `- Rata-rata/transaksi: Rp${Math.round(totalRev / data.recentSales.length).toLocaleString("id-ID")}` : ""}

⚠️ BAHAN BAKU RENDAH (${lowStockItems.length} item):
${lowStockItems.map((i) => `- ${i.name}: ${i.currentStock}/${i.minStock} ${i.unit}`).join("\n") || "Semua stok aman ✅"}

🥕 TOTAL BAHAN BAKU: ${data.ingredients.length}
🍳 TOTAL RESEP: ${data.recipes.length}

${data.metrics ? `📊 METRIK: Margin ${data.metrics.marginAvg.toFixed(1)}% | Growth ${data.metrics.growthRate.toFixed(1)}%` : ""}
`;
}

async function persistMessages(
  businessId: number,
  sessionId: number | undefined,
  userMsg: ChatMessage,
  assistantMsg: ChatMessage,
  contextType?: string
) {
  await prisma.chatMessage.createMany({
    data: [
      {
        businessId,
        sessionId: sessionId || null,
        role: userMsg.role,
        content: userMsg.content,
        contextType: contextType || "general",
      },
      {
        businessId,
        sessionId: sessionId || null,
        role: assistantMsg.role,
        content: assistantMsg.content,
        contextType: contextType || "general",
      },
    ],
  });
}

// ===================== CHAT HISTORY =====================

export async function getChatHistory(businessId: number, sessionId?: number, limit = 50) {
  return prisma.chatMessage.findMany({
    where: {
      businessId,
      ...(sessionId ? { sessionId } : {}),
      role: { not: "system" },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      role: true,
      content: true,
      contextType: true,
      createdAt: true,
    },
  });
}

export async function getChatSessions(businessId: number) {
  return prisma.chatSession.findMany({
    where: { businessId },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
}

export async function createChatSession(businessId: number, title?: string) {
  return prisma.chatSession.create({
    data: {
      businessId,
      title: title || "New Chat",
    },
  });
}

export async function deleteChatSession(sessionId: number, businessId: number) {
  return prisma.chatSession.delete({
    where: { id: sessionId, businessId },
  });
}



