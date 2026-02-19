import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/session";
import { uploadProductImage } from "@/lib/imagekit";
import { generateProductsByImage } from "@/lib/ai/product-generation";

export const runtime = "nodejs";

/**
 * POST /api/products/generate/image
 *
 * Generate multiple products from an image (menu, price list, product display).
 * Two-step validation:
 *   1. AI checks if the image is a valid product list
 *   2. If valid, AI extracts products with recipes
 *
 * Body: FormData with `file` (image)
 * Returns: { isValid, products: AIGeneratedProduct[], error? }
 */
export async function POST(request: NextRequest) {
  try {
    const { businessId } = await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image (JPEG, PNG, WebP)" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be smaller than 10MB" }, { status: 400 });
    }

    // Upload to ImageKit (auto-expires in 2 minutes)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadResult = await uploadProductImage(buffer, "product-list", 2);

    // Fetch existing ingredients (with cost data) and categories for AI context
    const [rawIngredients, categories] = await Promise.all([
      prisma.ingredient.findMany({
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
      }),
      prisma.category.findMany({
        where: { businessId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const ingredients = rawIngredients.map((ing) => {
      const batches = ing.inventoryBatches;
      const totalQty = batches.reduce((s, b) => s + Number(b.remainingQty), 0);
      const totalCost = batches.reduce((s, b) => s + Number(b.remainingQty) * Number(b.costPerUnit), 0);
      const costPerUnit = totalQty > 0 ? totalCost / totalQty : batches[0] ? Number(batches[0].costPerUnit) : null;
      return { id: ing.id, name: ing.name, unit: ing.unit, costPerUnit };
    });

    // AI validation + extraction
    const result = await generateProductsByImage({
      imageUrl: uploadResult.url,
      existingIngredients: ingredients,
      existingCategories: categories,
    });

    if (!result.isValid) {
      return NextResponse.json(
        {
          success: false,
          isValid: false,
          error: result.error,
          products: [],
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      isValid: true,
      data: result.products,
      meta: {
        productsFound: result.products.length,
        imageUrl: uploadResult.url,
        expiresIn: "2 minutes",
        note: "Review the generated products. To create them, POST to /api/products with { products: [...] } after resolving any new ingredients.",
      },
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/products/generate/image error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process image",
      },
      { status: 500 },
    );
  }
}
