import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

if (!process.env.GROQ_API_KEY) {
  throw new Error("Missing GROQ_API_KEY environment variable");
}

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Model configuration
export const GROQ_MODELS = {
  // Vision-capable models (support image input)
  vision: {
    primary: "meta-llama/llama-4-scout-17b-16e-instruct",
    fallback: "meta-llama/llama-4-maverick-17b-128e-instruct",
  },
  // Text-only models (better for text analysis)
  text: {
    primary: "openai/gpt-oss-120b",
    fallback: "openai/gpt-oss-safeguard-20b",
  },
};

export interface AnalyzeBusinessDataOptions {
  prompt: string;
  imageUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  useFallback?: boolean;
}

/**
 * Analyze business data using GROQ AI with optional image input
 * @param options - Configuration options for the analysis
 * @returns The AI-generated analysis text
 */
export async function analyzeBusinessData(options: AnalyzeBusinessDataOptions): Promise<string> {
  const { prompt, imageUrl, temperature = 0.7, maxTokens = 1024, useFallback = false } = options;

  // Select appropriate model based on whether image is provided
  const modelConfig = imageUrl ? GROQ_MODELS.vision : GROQ_MODELS.text;
  const selectedModel = useFallback ? modelConfig.fallback : modelConfig.primary;

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are a business analyst assistant for UMKM (Usaha Mikro Kecil Menengah). Analyze business data and provide insights on sales, inventory, products, and financial metrics. Provide actionable recommendations based on the data.",
    },
  ];

  if (imageUrl) {
    // Vision model format - supports image_url
    messages.push({
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    });
  } else {
    // Text-only format
    messages.push({
      role: "user",
      content: prompt,
    });
  }

  try {
    console.log(`🤖 Using GROQ model: ${selectedModel} ${imageUrl ? "(vision)" : "(text)"}`);

    const completion = await groq.chat.completions.create({
      messages,
      model: selectedModel,
      temperature,
      max_tokens: maxTokens,
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error: unknown) {
    // If primary model fails, try fallback within the same category
    if (!useFallback) {
      console.warn(`⚠️ Primary model failed, trying fallback: ${modelConfig.fallback}`);
      return analyzeBusinessData({
        ...options,
        useFallback: true,
      });
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ GROQ API Error:", errorMessage);
    throw new Error(`Failed to analyze with GROQ: ${errorMessage}`);
  }
}

/**
 * Analyze sales data from the ERD
 */
export async function analyzeSalesData(salesData: unknown, imageUrl?: string): Promise<string> {
  const prompt = `Analyze the following sales data from a UMKM business:
${JSON.stringify(salesData, null, 2)}

Please provide:
1. Revenue trends analysis
2. Payment status insights
3. Recommendations for improving sales
4. Key metrics and patterns`;

  return analyzeBusinessData({ prompt, imageUrl });
}

/**
 * Analyze inventory data from the ERD
 */
export async function analyzeInventoryData(inventoryData: unknown, imageUrl?: string): Promise<string> {
  const prompt = `Analyze the following inventory data from a UMKM business:
${JSON.stringify(inventoryData, null, 2)}

Please provide:
1. Stock level analysis
2. Low stock alerts
3. Recommendations for inventory management
4. Expiration date warnings if applicable`;

  return analyzeBusinessData({ prompt, imageUrl });
}

/**
 * Analyze product performance from the ERD
 */
export async function analyzeProductPerformance(
  productData: unknown,
  salesData: unknown,
  imageUrl?: string,
): Promise<string> {
  const prompt = `Analyze the following product and sales data from a UMKM business:

Products:
${JSON.stringify(productData, null, 2)}

Sales:
${JSON.stringify(salesData, null, 2)}

Please provide:
1. Best-selling products analysis
2. Product profitability insights
3. Recommendations for product optimization
4. Pricing strategy suggestions`;

  return analyzeBusinessData({ prompt, imageUrl });
}

/**
 * Get business health score and recommendations
 */
export async function getBusinessHealthScore(businessMetrics: unknown, imageUrl?: string): Promise<string> {
  const prompt = `Based on the following business metrics from a UMKM business:
${JSON.stringify(businessMetrics, null, 2)}

Please provide:
1. Overall business health score (0-100)
2. Revenue health analysis
3. Profit margin analysis
4. Waste management insights
5. Stability score interpretation
6. Actionable recommendations for improvement`;

  return analyzeBusinessData({ prompt, imageUrl });
}

/**
 * Analyze recipe and ingredient costs
 */
export async function analyzeRecipeCosts(
  recipeData: unknown,
  ingredientData: unknown,
  imageUrl?: string,
): Promise<string> {
  const prompt = `Analyze the following recipe and ingredient cost data from a UMKM business:

Recipes:
${JSON.stringify(recipeData, null, 2)}

Ingredients:
${JSON.stringify(ingredientData, null, 2)}

Please provide:
1. Cost analysis per recipe
2. Most expensive ingredients
3. Recommendations for cost optimization
4. Alternative ingredient suggestions`;

  return analyzeBusinessData({ prompt, imageUrl });
}
