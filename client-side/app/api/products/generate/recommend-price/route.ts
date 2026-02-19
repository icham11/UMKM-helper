import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth/session";
import { groq, GROQ_MODELS } from "@/lib/groq";
import { recommendPriceSchema } from "@/lib/validations/product";

export const runtime = "nodejs";

/**
 * POST /api/products/generate/recommend-price
 *
 * Generate a recommended selling price based on recipe cost.
 * The wireframe shows a "Generate" button next to the sell price field
 * that suggests a price based on the accumulated ingredient costs.
 *
 * Body: { recipeCost: number, categoryName?: string, productName?: string }
 * Returns: { recommendedPrice, margin, reasoning }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();

    const parsed = recommendPriceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { recipeCost, categoryName, productName } = parsed.data;

    // For very low costs, use a simple multiplier without AI
    if (recipeCost === 0) {
      return NextResponse.json({
        success: true,
        data: {
          recommendedPrice: 0,
          margin: 0,
          reasoning: "Recipe cost is zero — add ingredients first.",
        },
      });
    }

    const prompt = `You are a pricing expert for UMKM (Indonesian small businesses).

Given this data:
- Product name: ${productName || "Unknown"}
- Category: ${categoryName || "Unknown"}
- Total recipe/ingredient cost: Rp ${recipeCost.toLocaleString("id-ID")}

Recommend a selling price in IDR. Consider:
1. Typical UMKM margins (usually 50-200% markup depending on category)
2. Indonesian market pricing psychology (round numbers, e.g., Rp 15.000, Rp 20.000, Rp 25.000)
3. The product category (beverages typically have higher margins than food)

Respond with ONLY this JSON format:
{
  "recommendedPrice": 25000,
  "margin": 65.5,
  "reasoning": "Brief 1-line explanation"
}

"margin" is the profit margin percentage: ((price - cost) / price) * 100`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a pricing expert. Respond ONLY with valid JSON, no markdown or explanations.",
        },
        { role: "user", content: prompt },
      ],
      model: GROQ_MODELS.text.primary,
      temperature: 0.3,
      max_tokens: 256,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content || "";

    try {
      const result = JSON.parse(raw);
      return NextResponse.json({
        success: true,
        data: {
          recommendedPrice: Number(result.recommendedPrice) || recipeCost * 2,
          margin: Number(result.margin) || 50,
          reasoning: String(result.reasoning || "Standard UMKM markup applied."),
          recipeCost,
        },
      });
    } catch {
      // Fallback: simple 2x markup with rounding
      const fallbackPrice = Math.ceil((recipeCost * 2) / 1000) * 1000;
      return NextResponse.json({
        success: true,
        data: {
          recommendedPrice: fallbackPrice,
          margin: Math.round(((fallbackPrice - recipeCost) / fallbackPrice) * 100),
          reasoning: "Standard 2x markup with rounding (AI parse failed).",
          recipeCost,
        },
      });
    }
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/products/generate/recommend-price error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate price recommendation",
      },
      { status: 500 },
    );
  }
}
