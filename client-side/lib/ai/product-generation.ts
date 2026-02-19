import { groq, GROQ_MODELS } from "@/lib/groq";
import type { AIGeneratedProduct } from "@/lib/validations/product";

// ===================== SYSTEM PROMPTS =====================

const PRODUCT_SYSTEM_PROMPT = `You are an AI assistant for UMKM (Indonesian small businesses).
You help generate product data including recipes and ingredients.
You MUST respond ONLY with valid JSON — no markdown, no code fences, no explanation text.
All prices should be in Indonesian Rupiah (IDR).
All quantities should use standard metric units (gram, ml, butir, lembar, etc.).`;

// ===================== GENERATE BY NAME =====================

interface GenerateByNameParams {
  productName: string;
  existingIngredients: { id: number; name: string; unit: string; costPerUnit?: number | null }[];
  existingCategories: { id: number; name: string }[];
}

/**
 * Generate a single product with recipe from just a product name.
 * Uses existing ingredients when possible, suggests new ones when needed.
 */
export async function generateProductByName(params: GenerateByNameParams): Promise<AIGeneratedProduct> {
  const { productName, existingIngredients, existingCategories } = params;

  const prompt = `Generate product data for: "${productName}"

EXISTING INGREDIENTS in the business database (prefer using these by their exact ID and name):
${JSON.stringify(existingIngredients, null, 2)}

EXISTING CATEGORIES in the business:
${JSON.stringify(existingCategories.map((c) => c.name))}

Respond with a SINGLE JSON object (NOT an array) in this exact format:
{
  "name": "product name",
  "categoryName": "one of the existing categories above, or suggest a new one if none fit",
  "sellingPrice": 25000,
  "recipe": [
    {
      "ingredientId": 101,
      "ingredientName": "Existing Ingredient Name",
      "unit": "gram",
      "quantity": 200,
      "costPerUnit": 100
    },
    {
      "ingredientName": "New Ingredient Not In DB",
      "unit": "ml",
      "quantity": 50,
      "costPerUnit": 50
    }
  ]
}

Rules:
- If an ingredient exists in the database, include its "ingredientId" and use its costPerUnit from the data above. If it does NOT exist, omit "ingredientId" and estimate a realistic costPerUnit in IDR.
- "costPerUnit" is the cost per 1 unit (per gram, per ml, per butir, etc.) in IDR.
- "sellingPrice" should be a realistic retail price in IDR, typically 2-3x the total recipe cost.
- "quantity" is how much of the ingredient is needed to make ONE unit of the product.
- Use the most appropriate unit for each ingredient.
- The recipe should be realistic and complete.`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: PRODUCT_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    model: GROQ_MODELS.text.primary,
    temperature: 0.4,
    max_tokens: 1024,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content || "";
  return parseAIProductResponse(raw);
}

// ===================== GENERATE BY IMAGE (BULK) =====================

interface GenerateByImageParams {
  imageUrl: string;
  existingIngredients: { id: number; name: string; unit: string; costPerUnit?: number | null }[];
  existingCategories: { id: number; name: string }[];
}

/**
 * Generate multiple products from an image (e.g. a menu, price list, or product display).
 * Step 1 of the image flow: validates the image is a list, then extracts products.
 */
export async function generateProductsByImage(
  params: GenerateByImageParams,
): Promise<{ isValid: boolean; products: AIGeneratedProduct[]; error?: string }> {
  const { imageUrl, existingIngredients, existingCategories } = params;

  const prompt = `Analyze this image. Is it a list of products, a menu, a price list, or a product display?

If YES — extract all products from the image and generate structured data for each.
If NO — respond with: { "isValid": false, "error": "description of why this is not a product list", "products": [] }

EXISTING INGREDIENTS in the business database (prefer using these by their exact ID and name):
${JSON.stringify(existingIngredients, null, 2)}

EXISTING CATEGORIES:
${JSON.stringify(existingCategories.map((c) => c.name))}

If the image IS a product list, respond with this exact JSON format:
{
  "isValid": true,
  "products": [
    {
      "name": "Product Name",
      "categoryName": "Category",
      "sellingPrice": 25000,
      "recipe": [
        {
          "ingredientId": 101,
          "ingredientName": "Existing Ingredient",
          "unit": "gram",
          "quantity": 200,
          "costPerUnit": 100
        },
        {
          "ingredientName": "New Ingredient",
          "unit": "ml",
          "quantity": 50,
          "costPerUnit": 50
        }
      ]
    }
  ]
}

Rules:
- Extract ALL products visible in the image.
- If prices are visible, use them. Otherwise estimate realistic IDR prices.
- For recipes: generate a realistic recipe for each product. Use existing ingredients when possible (include ingredientId and their costPerUnit from the data). For new ingredients, omit ingredientId and estimate costPerUnit.
- "costPerUnit" is the cost per 1 unit (per gram, per ml, etc.) in IDR.
- Use the same ingredient across products when it makes sense (e.g., "Susu Fresh Milk" for all milk-based drinks).`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: PRODUCT_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    model: GROQ_MODELS.vision.primary,
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content || "";

  try {
    const parsed = JSON.parse(raw);

    if (parsed.isValid === false) {
      return {
        isValid: false,
        products: [],
        error: parsed.error || "The image does not appear to be a product list.",
      };
    }

    const products: AIGeneratedProduct[] = Array.isArray(parsed.products) ? parsed.products : [];

    return { isValid: true, products };
  } catch {
    return {
      isValid: false,
      products: [],
      error: "Failed to parse AI response. Please try again.",
    };
  }
}

// ===================== GENERATE RECIPE BY IMAGE =====================

interface GenerateRecipeByImageParams {
  imageUrl: string;
  productName?: string;
  existingIngredients: { id: number; name: string; unit: string; costPerUnit?: number | null }[];
}

/**
 * Generate a recipe from a photo (e.g. a recipe card, ingredient list, or finished dish).
 * Used in the manual product creation flow.
 */
export async function generateRecipeByImage(params: GenerateRecipeByImageParams): Promise<{
  isValid: boolean;
  recipe: AIGeneratedProduct["recipe"];
  error?: string;
}> {
  const { imageUrl, productName, existingIngredients } = params;

  const contextLine = productName ? `This recipe is for: "${productName}".` : "Identify what this recipe is for.";

  const prompt = `Analyze this image. Is it a recipe, a list of ingredients, or a photo of food/ingredients?

${contextLine}

If the image shows a recipe or ingredients — extract the ingredient list.
If the image is NOT related to recipes or food — respond with: { "isValid": false, "error": "description", "recipe": [] }

EXISTING INGREDIENTS in the business database (use these by ID when possible):
${JSON.stringify(existingIngredients, null, 2)}

If valid, respond with this exact JSON format:
{
  "isValid": true,
  "recipe": [
    {
      "ingredientId": 101,
      "ingredientName": "Existing Ingredient",
      "unit": "gram",
      "quantity": 200,
      "costPerUnit": 100
    },
    {
      "ingredientName": "New Ingredient Not In DB",
      "unit": "ml",
      "quantity": 50,
      "costPerUnit": 50
    }
  ]
}

Rules:
- Match existing ingredients by name (case-insensitive). If matched, include "ingredientId" and use their costPerUnit from the data.
- For new ingredients, omit "ingredientId" and estimate a realistic costPerUnit in IDR.
- "costPerUnit" is the cost per 1 unit (per gram, per ml, per butir, etc.) in IDR.
- Quantities should be for ONE serving/unit of the product.
- Use standard units: gram, kg, ml, liter, butir, lembar, sendok makan (sdm), sendok teh (sdt), etc.`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: PRODUCT_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    model: GROQ_MODELS.vision.primary,
    temperature: 0.3,
    max_tokens: 2048,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content || "";

  try {
    const parsed = JSON.parse(raw);

    if (parsed.isValid === false) {
      return {
        isValid: false,
        recipe: [],
        error: parsed.error || "The image does not appear to be a recipe.",
      };
    }

    return {
      isValid: true,
      recipe: Array.isArray(parsed.recipe) ? parsed.recipe : [],
    };
  } catch {
    return {
      isValid: false,
      recipe: [],
      error: "Failed to parse AI response. Please try again.",
    };
  }
}

// ===================== HELPERS =====================

interface RawAIRecipeItem {
  ingredientId?: number;
  ingredientName?: string;
  name?: string;
  unit?: string;
  quantity?: number;
  costPerUnit?: number;
}

interface RawAIProductResponse {
  name?: string;
  categoryName?: string;
  sellingPrice?: number;
  recipe?: RawAIRecipeItem[];
}

function parseAIProductResponse(raw: string): AIGeneratedProduct {
  try {
    const parsed: RawAIProductResponse = JSON.parse(raw);

    // Validate minimum structure
    if (!parsed.name || !parsed.categoryName || !parsed.sellingPrice) {
      throw new Error("AI response missing required fields (name, categoryName, sellingPrice)");
    }

    const product: AIGeneratedProduct = {
      name: String(parsed.name),
      categoryName: String(parsed.categoryName),
      sellingPrice: Number(parsed.sellingPrice),
      recipe: Array.isArray(parsed.recipe)
        ? parsed.recipe.map((r: RawAIRecipeItem) => ({
            ...(r.ingredientId ? { ingredientId: Number(r.ingredientId) } : {}),
            ingredientName: String(r.ingredientName || r.name || "Unknown"),
            unit: String(r.unit || "gram"),
            quantity: Number(r.quantity || 0),
            costPerUnit: r.costPerUnit ? Number(r.costPerUnit) : undefined,
          }))
        : [],
    };

    product.recipeCost = product.recipe.reduce((sum, r) => sum + r.quantity * (r.costPerUnit ?? 0), 0);

    return product;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`AI returned invalid JSON: ${raw.substring(0, 200)}`);
    }
    throw error;
  }
}
