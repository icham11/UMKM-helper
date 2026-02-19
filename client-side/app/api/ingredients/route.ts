import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/session";
import { createIngredientSchema, bulkCreateIngredientsSchema } from "@/lib/validations/product";

export const runtime = "nodejs";

/**
 * GET /api/ingredients
 *
 * Query params: ?search=tepung&withBatches=true
 *
 * Success (200):
 *   {
 *     "success": true,
 *     "data": [{
 *       "id": 1, "name": "Tepung Terigu", "unit": "kg", "minStock": 5,
 *       "currentStock": 10, "costPerUnit": 12000,
 *       "inventoryBatches": [...]  // only when withBatches=true
 *     }]
 *   }
 *
 * Errors:
 *   401 — { "error": "Unauthorized" }
 *   500 — { "error": "Failed to fetch ingredients" }
 */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireAuth();

    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const withBatches = url.searchParams.get("withBatches") === "true";

    const ingredients = await prisma.ingredient.findMany({
      where: {
        businessId,
        ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
      },
      orderBy: { name: "asc" },
      include: {
        inventoryBatches: withBatches
          ? {
              where: { remainingQty: { gt: 0 } },
              orderBy: { receivedAt: "asc" },
            }
          : {
              where: { remainingQty: { gt: 0 } },
              orderBy: { receivedAt: "desc" },
              take: 1,
              select: { costPerUnit: true, remainingQty: true },
            },
      },
    });

    // Always compute currentStock and costPerUnit
    const data = ingredients.map((ing) => {
      const batches = ing.inventoryBatches;
      const currentStock = batches.reduce((sum, b) => sum + Number(b.remainingQty), 0);
      // Weighted average cost, or latest batch cost if no stock
      const totalCost = batches.reduce((sum, b) => sum + Number(b.remainingQty) * Number(b.costPerUnit), 0);
      const costPerUnit =
        currentStock > 0 ? totalCost / currentStock : batches[0] ? Number(batches[0].costPerUnit) : null;

      return {
        ...ing,
        currentStock,
        costPerUnit,
        ...(withBatches ? {} : { inventoryBatches: undefined }),
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/ingredients error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch ingredients",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/ingredients
 *
 * Single mode input (JSON):
 *   {
 *     "name": "Tepung Terigu", "unit": "kg", "minStock": 5,
 *     "initialBatch": { "quantity": 10, "costPerUnit": 12000, "expirationDate": "2026-06-01" }
 *   }
 *   initialBatch is optional.
 *
 * Bulk mode input (JSON):
 *   { "ingredients": [{ "name": "Gula", "unit": "kg", "initialBatch": { "quantity": 5, "costPerUnit": 14000 } }] }
 *
 * Success — Single (201 if new, 200 if existing):
 *   { "success": true, "data": { "id": 1, "name": "Tepung Terigu", "unit": "kg", "minStock": 5 } }
 *
 * Success — Bulk (201):
 *   { "success": true, "data": [{ "id": 2, "name": "Gula", "unit": "kg" }, ...] }
 *
 * Errors:
 *   400 — { "error": "Validation failed", "details": { ... } }
 *   401 — { "error": "Unauthorized" }
 *   500 — { "error": "Failed to create ingredient(s)" }
 */
export async function POST(request: NextRequest) {
  try {
    const { businessId } = await requireAuth();
    const body = await request.json();

    // --- Bulk mode ---
    if (body.ingredients && Array.isArray(body.ingredients)) {
      const parsed = bulkCreateIngredientsSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: parsed.error.flatten().fieldErrors,
          },
          { status: 400 },
        );
      }

      const results = await prisma.$transaction(async (tx) => {
        const created = [];

        for (const item of parsed.data.ingredients) {
          // Find-or-create to avoid duplicates
          let ingredient = await tx.ingredient.findFirst({
            where: {
              businessId,
              name: { equals: item.name, mode: "insensitive" },
            },
          });

          if (!ingredient) {
            ingredient = await tx.ingredient.create({
              data: {
                businessId,
                name: item.name,
                unit: item.unit,
                minStock: item.minStock ?? 0,
              },
            });
          }

          // Optionally create initial inventory batch
          if (item.initialBatch) {
            await tx.inventoryBatch.create({
              data: {
                ingredientId: ingredient.id,
                remainingQty: item.initialBatch.quantity,
                costPerUnit: item.initialBatch.costPerUnit,
                expirationDate: item.initialBatch.expirationDate ? new Date(item.initialBatch.expirationDate) : null,
              },
            });
          }

          created.push(ingredient);
        }

        return created;
      });

      return NextResponse.json({ success: true, data: results }, { status: 201 });
    }

    // --- Single mode ---
    const parsed = createIngredientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { name, unit, minStock, initialBatch } = parsed.data;

    // Check for existing ingredient with same name
    const existing = await prisma.ingredient.findFirst({
      where: {
        businessId,
        name: { equals: name, mode: "insensitive" },
      },
    });

    if (existing) {
      // If it already exists and there's an initial batch, just add the batch
      if (initialBatch) {
        await prisma.inventoryBatch.create({
          data: {
            ingredientId: existing.id,
            remainingQty: initialBatch.quantity,
            costPerUnit: initialBatch.costPerUnit,
            expirationDate: initialBatch.expirationDate ? new Date(initialBatch.expirationDate) : null,
          },
        });
      }
      return NextResponse.json({ success: true, data: existing });
    }

    const result = await prisma.$transaction(async (tx) => {
      const ingredient = await tx.ingredient.create({
        data: {
          businessId,
          name,
          unit,
          minStock: minStock ?? 0,
        },
      });

      if (initialBatch) {
        await tx.inventoryBatch.create({
          data: {
            ingredientId: ingredient.id,
            remainingQty: initialBatch.quantity,
            costPerUnit: initialBatch.costPerUnit,
            expirationDate: initialBatch.expirationDate ? new Date(initialBatch.expirationDate) : null,
          },
        });
      }

      return ingredient;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/ingredients error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create ingredient(s)",
      },
      { status: 500 },
    );
  }
}
