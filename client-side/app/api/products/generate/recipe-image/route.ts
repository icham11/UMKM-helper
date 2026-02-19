import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/session";
import { uploadRecipeImage } from "@/lib/imagekit";
import { generateRecipeByImage } from "@/lib/ai/product-generation";

export const runtime = "nodejs";

/**
 * POST /api/products/generate/recipe-image
 *
 * Generate a recipe from an image (recipe card, ingredient photo, finished dish).
 * Used in the manual product creation flow when a user wants to generate
 * ingredients from a photo instead of entering them manually.
 *
 * Body: FormData with `file` (image) and optional `productName` (string)
 * Returns: { isValid, recipe: RecipeItem[], error? }
 */
export async function POST(request: NextRequest) {
  try {
    const { businessId } = await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const productName = formData.get("productName") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image (JPEG, PNG, WebP)" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be smaller than 10MB" }, { status: 400 });
    }

    // Upload to ImageKit (auto-expires in 2 minutes)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadResult = await uploadRecipeImage(buffer, productName || "recipe", 2);

    // Fetch existing ingredients (with cost data) for AI context
    const rawIngredients = await prisma.ingredient.findMany({
      where: { businessId },
      select: {
        id: true,
        name: true,
        unit: true,
        inventoryBatches: {
          where: { remainingQty: { gt: 0 } },
          orderBy: { receivedAt: "desc" as const },
          select: { costPerUnit: true, remainingQty: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const ingredients = rawIngredients.map((ing) => {
      const batches = ing.inventoryBatches;
      const totalQty = batches.reduce((s, b) => s + Number(b.remainingQty), 0);
      const totalCost = batches.reduce((s, b) => s + Number(b.remainingQty) * Number(b.costPerUnit), 0);
      const costPerUnit = totalQty > 0 ? totalCost / totalQty : batches[0] ? Number(batches[0].costPerUnit) : null;
      return { id: ing.id, name: ing.name, unit: ing.unit, costPerUnit };
    });

    // AI validation + extraction
    const result = await generateRecipeByImage({
      imageUrl: uploadResult.url,
      productName: productName || undefined,
      existingIngredients: ingredients,
    });

    if (!result.isValid) {
      return NextResponse.json(
        {
          success: false,
          isValid: false,
          error: result.error,
          recipe: [],
        },
        { status: 422 },
      );
    }

    // Separate existing vs new ingredients for the frontend
    const existingRecipeItems = result.recipe.filter((r) => r.ingredientId);
    const newRecipeItems = result.recipe.filter((r) => !r.ingredientId);

    return NextResponse.json({
      success: true,
      isValid: true,
      data: {
        recipe: result.recipe,
        summary: {
          total: result.recipe.length,
          existingIngredients: existingRecipeItems.length,
          newIngredients: newRecipeItems.length,
        },
        newIngredientsToCreate: newRecipeItems.map((r) => ({
          name: r.ingredientName,
          unit: r.unit,
        })),
      },
      meta: {
        imageUrl: uploadResult.url,
        expiresIn: "2 minutes",
        note: "New ingredients must be created (POST /api/ingredients) before creating the product.",
      },
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/products/generate/recipe-image error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process recipe image",
      },
      { status: 500 },
    );
  }
}
