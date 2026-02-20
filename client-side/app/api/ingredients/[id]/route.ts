import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/session";
import { updateIngredientSchema } from "@/lib/validations/product";

export const runtime = "nodejs";

// ---------- GET ----------

/**
 * GET /api/ingredients/:id
 *
 * Fetch a single ingredient with its active batches.
 *
 * Success (200):
 *   {
 *     "success": true,
 *     "data": {
 *       "id": 1, "name": "Tepung Terigu", "unit": "kg", "minStock": 5,
 *       "currentStock": 10, "costPerUnit": 12000,
 *       "inventoryBatches": [
 *         { "id": 1, "remainingQty": 10, "costPerUnit": 12000, "expirationDate": null }
 *       ]
 *     }
 *   }
 *
 * Errors:
 *   401 — { "error": "Unauthorized" }
 *   404 — { "error": "Ingredient not found" }
 *   500 — { "error": "Failed to fetch ingredient" }
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireAuth();
    const { id } = await params;
    const ingredientId = Number(id);

    if (isNaN(ingredientId)) {
      return NextResponse.json({ error: "Invalid ingredient ID" }, { status: 400 });
    }

    const ingredient = await prisma.ingredient.findFirst({
      where: { id: ingredientId, businessId },
      include: {
        inventoryBatches: {
          where: { remainingQty: { gt: 0 } },
          orderBy: { receivedAt: "asc" },
        },
      },
    });

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
    }

    const batches = ingredient.inventoryBatches;
    const currentStock = batches.reduce((sum, b) => sum + Number(b.remainingQty), 0);
    const totalCost = batches.reduce((sum, b) => sum + Number(b.remainingQty) * Number(b.costPerUnit), 0);
    const costPerUnit =
      currentStock > 0 ? totalCost / currentStock : batches[0] ? Number(batches[0].costPerUnit) : null;

    return NextResponse.json({
      success: true,
      data: { ...ingredient, currentStock, costPerUnit },
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/ingredients/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch ingredient" },
      { status: 500 },
    );
  }
}

// ---------- PATCH ----------

/**
 * PATCH /api/ingredients/:id
 *
 * Update an ingredient and/or its latest inventory batch.
 * Designed for inline editing during product creation.
 *
 * Input (JSON) — all fields optional:
 *   {
 *     "name": "Tepung Terigu Protein Tinggi",
 *     "unit": "kg",
 *     "minStock": 5,
 *     "batch": {
 *       "remainingQty": 10,
 *       "costPerUnit": 15000,
 *       "expirationDate": "2026-06-01T00:00:00.000Z"
 *     }
 *   }
 *
 * Batch behavior:
 *   - If the ingredient has an existing batch → updates it
 *   - If no batch exists → creates a new one
 *   - Only updates the fields provided in `batch`
 *
 * Success (200):
 *   {
 *     "success": true,
 *     "data": {
 *       "id": 1, "name": "Tepung Terigu Protein Tinggi", "unit": "kg", "minStock": 5,
 *       "currentStock": 10, "costPerUnit": 15000,
 *       "inventoryBatches": [...]
 *     }
 *   }
 *
 * Errors:
 *   400 — { "error": "Validation failed", "details": { ... } }
 *   400 — { "error": "Invalid ingredient ID" }
 *   401 — { "error": "Unauthorized" }
 *   404 — { "error": "Ingredient not found" }
 *   409 — { "error": "Ingredient \"...\" already exists" }
 *   500 — { "error": "Failed to update ingredient" }
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireAuth();
    const { id } = await params;
    const ingredientId = Number(id);

    if (isNaN(ingredientId)) {
      return NextResponse.json({ error: "Invalid ingredient ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateIngredientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, unit, minStock, batch } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // Verify the ingredient belongs to this business
      const existing = await tx.ingredient.findFirst({
        where: { id: ingredientId, businessId },
        include: {
          inventoryBatches: {
            where: { remainingQty: { gte: 0 } },
            orderBy: { receivedAt: "desc" },
            take: 1,
          },
        },
      });

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      // Check for name conflicts if renaming
      if (name && name.toLowerCase() !== existing.name.toLowerCase()) {
        const conflict = await tx.ingredient.findFirst({
          where: {
            businessId,
            name: { equals: name, mode: "insensitive" },
            id: { not: ingredientId },
          },
          select: { name: true },
        });

        if (conflict) {
          throw new Error(`CONFLICT:Ingredient "${conflict.name}" already exists`);
        }
      }

      // Update ingredient fields
      const ingredientData: Record<string, unknown> = {};
      if (name !== undefined) ingredientData.name = name;
      if (unit !== undefined) ingredientData.unit = unit;
      if (minStock !== undefined) ingredientData.minStock = minStock;

      if (Object.keys(ingredientData).length > 0) {
        await tx.ingredient.update({
          where: { id: ingredientId },
          data: ingredientData,
        });
      }

      // Update or create batch
      if (batch) {
        const existingBatch = existing.inventoryBatches[0];

        if (existingBatch) {
          // Update the latest batch
          const batchData: Record<string, unknown> = {};
          if (batch.remainingQty !== undefined) batchData.remainingQty = batch.remainingQty;
          if (batch.costPerUnit !== undefined) batchData.costPerUnit = batch.costPerUnit;
          if (batch.expirationDate !== undefined) {
            batchData.expirationDate = batch.expirationDate ? new Date(batch.expirationDate) : null;
          }

          if (Object.keys(batchData).length > 0) {
            await tx.inventoryBatch.update({
              where: { id: existingBatch.id },
              data: batchData,
            });
          }
        } else {
          // No batch exists — create one
          await tx.inventoryBatch.create({
            data: {
              ingredientId,
              remainingQty: batch.remainingQty ?? 0,
              costPerUnit: batch.costPerUnit ?? 0,
              expirationDate: batch.expirationDate ? new Date(batch.expirationDate) : null,
            },
          });
        }
      }

      // Refetch with all active batches
      return tx.ingredient.findFirst({
        where: { id: ingredientId, businessId },
        include: {
          inventoryBatches: {
            where: { remainingQty: { gt: 0 } },
            orderBy: { receivedAt: "asc" },
          },
        },
      });
    });

    if (!result) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
    }

    // Enrich with computed fields
    const batches = result.inventoryBatches;
    const currentStock = batches.reduce((sum, b) => sum + Number(b.remainingQty), 0);
    const totalCost = batches.reduce((sum, b) => sum + Number(b.remainingQty) * Number(b.costPerUnit), 0);
    const costPerUnit =
      currentStock > 0 ? totalCost / currentStock : batches[0] ? Number(batches[0].costPerUnit) : null;

    return NextResponse.json({
      success: true,
      data: { ...result, currentStock, costPerUnit },
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
      }
      if (error.message.startsWith("CONFLICT:")) {
        return NextResponse.json({ error: error.message.replace("CONFLICT:", "") }, { status: 409 });
      }
    }

    console.error("PATCH /api/ingredients/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update ingredient" },
      { status: 500 },
    );
  }
}

// ---------- DELETE ----------

/**
 * DELETE /api/ingredients/:id
 *
 * Delete an ingredient and all its associated batches and inventory movements (cascade).
 * Will fail if the ingredient is referenced by any product recipe.
 *
 * Success (200):
 *   { "success": true }
 *
 * Errors:
 *   400 — { "error": "Invalid ingredient ID" }
 *   401 — { "error": "Unauthorized" }
 *   404 — { "error": "Ingredient not found" }
 *   409 — { "error": "Ingredient is used in one or more product recipes and cannot be deleted" }
 *   500 — { "error": "Failed to delete ingredient" }
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireAuth();
    const { id } = await params;
    const ingredientId = Number(id);

    if (isNaN(ingredientId)) {
      return NextResponse.json({ error: "Invalid ingredient ID" }, { status: 400 });
    }

    // Verify the ingredient exists and belongs to this business
    const ingredient = await prisma.ingredient.findFirst({
      where: { id: ingredientId, businessId },
      select: { id: true, _count: { select: { recipes: true } } },
    });

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
    }

    // Block deletion if it's used in any product recipe
    if (ingredient._count.recipes > 0) {
      return NextResponse.json(
        { error: "Ingredient is used in one or more product recipes and cannot be deleted" },
        { status: 409 },
      );
    }

    // Cascade deletes batches and inventory movements automatically (schema onDelete: Cascade)
    await prisma.ingredient.delete({ where: { id: ingredientId } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/ingredients/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete ingredient" },
      { status: 500 },
    );
  }
}
