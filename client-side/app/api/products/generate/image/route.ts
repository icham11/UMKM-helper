import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/session";
import { uploadProductImage } from "@/lib/imagekit";
import { generateProductsByImage } from "@/lib/ai/product-generation";
import { resolveIngredients } from "@/lib/helpers/resolve-ingredients";

export const runtime = "nodejs";

/**
 * POST /api/products/generate/image
 *
 * Generate multiple products from an image (menu, price list, product display).
 * Auto-resolves ingredients (find existing or create new).
 *
 * Input: FormData with `file` (image, max 10MB, JPEG/PNG/WebP)
 *
 * Success (200):
 *   {
 *     "success": true, "isValid": true,
 *     "data": [{
 *       "name": "Nasi Goreng", "categoryName": "Makanan", "sellingPrice": 20000,
 *       "recipe": [{
 *         "ingredientId": 1, "ingredientName": "Nasi", "unit": "gram",
 *         "quantity": 200, "costPerUnit": 50, "isNew": false
 *       }]
 *     }],
 *     "readyToCreate": {
 *       "products": [{
 *         "name": "Nasi Goreng", "categoryName": "Makanan", "sellingPrice": 20000,
 *         "recipe": [{ "ingredientId": 1, "quantity": 200 }]
 *       }]
 *     },
 *     "meta": {
 *       "productsFound": 1, "newIngredientsCreated": ["Sambal"],
 *       "imageUrl": "https://...", "expiresIn": "2 minutes"
 *     }
 *   }
 *
 * Invalid image (422):
 *   { "success": false, "isValid": false, "error": "...", "products": [] }
 *
 * Errors:
 *   400 — { "error": "No image file provided" }
 *   400 — { "error": "File must be an image (JPEG, PNG, WebP)" }
 *   400 — { "error": "Image must be smaller than 10MB" }
 *   401 — { "error": "Unauthorized" }
 *   500 — { "error": "Failed to process image" }
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

    // Auto-resolve ingredients: find existing or create new ones
    const { resolved, newIngredientsCreated } = await resolveIngredients(businessId, result.products);

    // Transform to POST /api/products ready format
    const readyProducts = resolved.map((p) => ({
      name: p.name,
      categoryName: p.categoryName,
      sellingPrice: p.sellingPrice,
      recipe: p.recipe.map((r) => ({
        ingredientId: r.ingredientId,
        quantity: r.quantity,
      })),
    }));

    return NextResponse.json({
      success: true,
      isValid: true,
      data: resolved,
      readyToCreate: { products: readyProducts },
      meta: {
        productsFound: resolved.length,
        newIngredientsCreated,
        imageUrl: uploadResult.url,
        expiresIn: "2 minutes",
        note: "Ingredients have been auto-resolved. Use readyToCreate payload to POST /api/products directly.",
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
