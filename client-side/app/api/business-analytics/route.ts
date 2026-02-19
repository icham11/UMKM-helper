import { NextRequest, NextResponse } from "next/server";
import {
  analyzeSalesData,
  analyzeInventoryData,
  analyzeProductPerformance,
  getBusinessHealthScore,
  analyzeRecipeCosts,
} from "@/lib/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, imageUrl } = body;

    if (!type || !data) {
      return NextResponse.json({ error: "Missing type or data in request body" }, { status: 400 });
    }

    let analysis: string;

    switch (type) {
      case "sales":
        analysis = await analyzeSalesData(data, imageUrl);
        break;

      case "inventory":
        analysis = await analyzeInventoryData(data, imageUrl);
        break;

      case "product-performance":
        if (!data.products || !data.sales) {
          return NextResponse.json(
            { error: "Product performance analysis requires both products and sales data" },
            { status: 400 },
          );
        }
        analysis = await analyzeProductPerformance(data.products, data.sales, imageUrl);
        break;

      case "business-health":
        analysis = await getBusinessHealthScore(data, imageUrl);
        break;

      case "recipe-costs":
        if (!data.recipes || !data.ingredients) {
          return NextResponse.json(
            { error: "Recipe cost analysis requires both recipes and ingredients data" },
            { status: 400 },
          );
        }
        analysis = await analyzeRecipeCosts(data.recipes, data.ingredients, imageUrl);
        break;

      default:
        return NextResponse.json({ error: `Unknown analysis type: ${type}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      type,
      analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("Business analytics error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: errorMessage || "Failed to analyze business data",
        details: String(error),
      },
      { status: 500 },
    );
  }
}

// GET endpoint to check API status
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Business analytics API is ready",
    supportedTypes: ["sales", "inventory", "product-performance", "business-health", "recipe-costs"],
    description: {
      sales: "Analyze sales data for revenue trends and payment insights",
      inventory: "Analyze inventory levels and stock management",
      "product-performance": "Analyze product sales performance and profitability",
      "business-health": "Calculate overall business health score",
      "recipe-costs": "Analyze recipe costs and ingredient optimization",
    },
  });
}
