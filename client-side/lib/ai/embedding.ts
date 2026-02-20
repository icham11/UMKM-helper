/**
 * Gemini Embedding Service for RAG
 * Uses Google Gemini text-embedding-004 model (768 dimensions)
 *
 * Flow:
 * 1. Text → Gemini API → Embedding vector (768 dims)
 * 2. Vector stored in PostgreSQL via pgvector
 * 3. Query → Embed → Cosine similarity search → Top-K relevant docs
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;
const GEMINI_EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:embedContent`;
const GEMINI_BATCH_EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:batchEmbedContents`;

// ==================== EMBEDDING GENERATION ====================

/**
 * Generate a single embedding vector from text using Gemini
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set. Required for RAG embeddings.");
  }

  const response = await fetch(`${GEMINI_EMBEDDING_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${GEMINI_EMBEDDING_MODEL}`,
      content: {
        parts: [{ text: text.slice(0, 10000) }], // Gemini limit
      },
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini Embedding API error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  return data.embedding.values as number[];
}

/**
 * Generate embedding for a query (uses RETRIEVAL_QUERY task type for better search)
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const response = await fetch(`${GEMINI_EMBEDDING_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${GEMINI_EMBEDDING_MODEL}`,
      content: {
        parts: [{ text: query.slice(0, 10000) }],
      },
      taskType: "RETRIEVAL_QUERY",
      outputDimensionality: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini Query Embedding error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  return data.embedding.values as number[];
}

/**
 * Generate embeddings for multiple texts in batch (max 100 per batch)
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const batchSize = 100; // Gemini batch limit
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const requests = batch.map((text) => ({
      model: `models/${GEMINI_EMBEDDING_MODEL}`,
      content: {
        parts: [{ text: text.slice(0, 10000) }],
      },
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: EMBEDDING_DIMENSIONS,
    }));

    const response = await fetch(
      `${GEMINI_BATCH_EMBEDDING_URL}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini Batch Embedding error: ${response.status} — ${error}`);
    }

    const data = await response.json();
    const embeddings = data.embeddings.map(
      (e: { values: number[] }) => e.values
    );
    allEmbeddings.push(...embeddings);

    // Rate limit pause between batches
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return allEmbeddings;
}

export { EMBEDDING_DIMENSIONS };


