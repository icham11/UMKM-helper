import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/session";
import { createProductSchema, bulkCreateProductsSchema } from "@/lib/validations/product";

export const runtime = "nodejs";

// ---------- helpers ----------

/** Find-or-create a category within the business (case-insensitive). */
async function resolveCategory(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  businessId: number,
  categoryName: string,
): Promise<number> {
  const existing = await tx.category.findFirst({
    where: {
      businessId,
      name: { equals: categoryName, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await tx.category.create({
    data: { businessId, name: categoryName },
    select: { id: true },
  });
  return created.id;
}

/** Check that all ingredient IDs belong to the given business. */
async function validateIngredients(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  businessId: number,
  ingredientIds: number[],
): Promise<void> {
  if (ingredientIds.length === 0) return;

  const unique = [...new Set(ingredientIds)];
  const found = await tx.ingredient.findMany({
    where: { id: { in: unique }, businessId },
    select: { id: true },
  });

  if (found.length !== unique.length) {
    const foundSet = new Set(found.map((i) => i.id));
    const missing = unique.filter((id) => !foundSet.has(id));
    throw new Error(`Ingredient IDs not found in this business: ${missing.join(", ")}`);
  }
}

/** Check for duplicate product names within the business. */
async function checkDuplicateProducts(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  businessId: number,
  names: string[],
): Promise<string[]> {
  const existing = await tx.product.findMany({
    where: {
      businessId,
      name: { in: names, mode: "insensitive" },
    },
    select: { name: true },
  });
  return existing.map((p) => p.name);
}

// ---------- GET ----------

/**
 * GET /api/products
 *
 * Query params: ?search=kopi&categoryId=1&withRecipe=true (default withRecipe=true)
 *
 * Success (200):
 *   {
 *     "success": true,
 *     "data": [{
 *       "id": 1, "name": "Kopi Susu", "sellingPrice": 25000,
 *       "businessId": 1, "categoryId": 1,
 *       "category": { "id": 1, "name": "Minuman" },
 *       "recipes": [{
 *         "id": 1, "quantity": 0.02,
 *         "ingredient": {
 *           "id": 1, "name": "Kopi Bubuk", "unit": "kg",
 *           "costPerUnit": 120000, "currentStock": 5
 *         }
 *       }],
 *       "recipeCost": 2400
 *     }]
 *   }
 *
 * Errors:
 *   401 — { "error": "Unauthorized" }
 *   500 — { "error": "Failed to fetch products" }
 */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireAuth();

    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const categoryId = url.searchParams.get("categoryId");
    const withRecipe = url.searchParams.get("withRecipe") !== "false"; // default true

    const where = {
      businessId,
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
      ...(categoryId ? { categoryId: Number(categoryId) } : {}),
    };

    // Split query paths so Prisma can infer ingredient.inventoryBatches type
    if (!withRecipe) {
      const products = await prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { category: { select: { id: true, name: true } } },
      });
      return NextResponse.json({ success: true, data: products });
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true } },
        recipes: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                unit: true,
                inventoryBatches: {
                  where: { remainingQty: { gt: 0 } },
                  orderBy: { receivedAt: "desc" },
                  select: { costPerUnit: true, remainingQty: true },
                },
              },
            },
          },
        },
      },
    });

    // Enrich with costPerUnit and recipeCost for the wireframe
    const enriched = products.map((product) => {
      const recipesWithCost = product.recipes.map((r) => {
        const batches = r.ingredient.inventoryBatches;
        const currentStock = batches.reduce((sum, b) => sum + Number(b.remainingQty), 0);
        const totalCost = batches.reduce((sum, b) => sum + Number(b.remainingQty) * Number(b.costPerUnit), 0);
        const costPerUnit =
          currentStock > 0 ? totalCost / currentStock : batches[0] ? Number(batches[0].costPerUnit) : null;

        return {
          ...r,
          ingredient: {
            id: r.ingredient.id,
            name: r.ingredient.name,
            unit: r.ingredient.unit,
            costPerUnit,
            currentStock,
          },
        };
      });

      const recipeCost = recipesWithCost.reduce((sum, r) => {
        return sum + Number(r.quantity) * (r.ingredient.costPerUnit ?? 0);
      }, 0);

      return { ...product, recipes: recipesWithCost, recipeCost: Math.round(recipeCost) };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch products" },
      { status: 500 },
    );
  }
}

// ---------- POST ----------

/**
 * POST /api/products
 *
 * Single input (JSON):
 *   {
 *     "name": "Kopi Susu", "categoryName": "Minuman", "sellingPrice": 25000,
 *     "recipe": [{ "ingredientId": 1, "quantity": 0.02 }]
 *   }
 *
 * Bulk input (JSON):
 *   { "products": [ ...single shape... ] }
 *
 * Success (201):
 *   {
 *     "success": true,
 *     "data": {
 *       "id": 1, "name": "Kopi Susu", "sellingPrice": 25000,
 *       "categoryId": 1,
 *       "category": { "id": 1, "name": "Minuman" },
 *       "recipes": [{
 *         "id": 1, "quantity": 0.02,
 *         "ingredient": { "id": 1, "name": "Kopi Bubuk", "unit": "kg" }
 *       }]
 *     }
 *   }
 *
 * Errors:
 *   400 — { "error": "Validation failed", "details": { ... } }
 *   400 — { "error": "Ingredient IDs not found in this business: 99" }
 *   401 — { "error": "Unauthorized" }
 *   409 — { "error": "Product \"Kopi Susu\" already exists." }
 *   500 — { "error": "Failed to create product(s)" }
 */
export async function POST(request: NextRequest) {
  try {
    const { businessId } = await requireAuth();
    const body = await request.json();

    // Determine single vs bulk
    const isBulk = body.products && Array.isArray(body.products);

    if (isBulk) {
      const parsed = bulkCreateProductsSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
          { status: 400 },
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const productNames = parsed.data.products.map((p) => p.name);

        // Duplicate check
        const duplicates = await checkDuplicateProducts(tx, businessId, productNames);
        if (duplicates.length > 0) {
          throw new Error(`Products already exist: ${duplicates.join(", ")}. Remove duplicates or rename them.`);
        }

        // Validate all ingredient IDs upfront
        const allIngredientIds = parsed.data.products.flatMap((p) => p.recipe.map((r) => r.ingredientId));
        await validateIngredients(tx, businessId, allIngredientIds);

        const created = [];

        for (const item of parsed.data.products) {
          const categoryId = await resolveCategory(tx, businessId, item.categoryName);

          const product = await tx.product.create({
            data: {
              businessId,
              categoryId,
              name: item.name,
              sellingPrice: item.sellingPrice,
            },
          });

          // Create recipe entries
          if (item.recipe.length > 0) {
            await tx.recipe.createMany({
              data: item.recipe.map((r) => ({
                productId: product.id,
                ingredientId: r.ingredientId,
                quantity: r.quantity,
              })),
            });
          }

          // Refetch with relations
          const full = await tx.product.findUnique({
            where: { id: product.id },
            include: {
              category: { select: { id: true, name: true } },
              recipes: {
                include: {
                  ingredient: { select: { id: true, name: true, unit: true } },
                },
              },
            },
          });

          created.push(full);
        }

        return created;
      });

      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    // --- Single product ---
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, categoryName, sellingPrice, recipe } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // Duplicate check
      const duplicates = await checkDuplicateProducts(tx, businessId, [name]);
      if (duplicates.length > 0) {
        throw new Error(`Product "${name}" already exists.`);
      }

      // Validate ingredients
      const ingredientIds = recipe.map((r) => r.ingredientId);
      await validateIngredients(tx, businessId, ingredientIds);

      // Resolve category
      const categoryId = await resolveCategory(tx, businessId, categoryName);

      // Create product
      const product = await tx.product.create({
        data: {
          businessId,
          categoryId,
          name,
          sellingPrice,
        },
      });

      // Create recipe entries
      if (recipe.length > 0) {
        await tx.recipe.createMany({
          data: recipe.map((r) => ({
            productId: product.id,
            ingredientId: r.ingredientId,
            quantity: r.quantity,
          })),
        });
      }

      // Return full product with relations
      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          category: { select: { id: true, name: true } },
          recipes: {
            include: {
              ingredient: { select: { id: true, name: true, unit: true } },
            },
          },
        },
      });
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Transaction errors from duplicate / validation checks
    if (error instanceof Error && error.message.includes("already exist")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("POST /api/products error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create product(s)" },
      { status: 500 },
    );
  }
}
