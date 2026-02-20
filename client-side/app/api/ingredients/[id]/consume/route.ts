import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/session";
import { StockDocumentType, InventoryMovementType } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { businessId } = await requireAuth();
    const { id } = await context.params;

    const ingredientId = Number(id);

    if (isNaN(ingredientId)) {
      return NextResponse.json(
        { error: "Invalid ingredient ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { quantity, notes } = body;

    if (typeof quantity !== "number" || quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be a positive number" },
        { status: 400 }
      );
    }

    const ingredient = await prisma.ingredient.findFirst({
      where: { id: ingredientId, businessId },
    });

    if (!ingredient) {
      return NextResponse.json(
        { error: "Ingredient not found" },
        { status: 404 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 🔥 Ambil batch FIFO
      const batches = await tx.inventoryBatch.findMany({
        where: {
          ingredientId,
          remainingQty: { gt: 0 },
        },
        orderBy: { receivedAt: "asc" },
      });

      // 🔎 Hitung total stock dulu (prevent partial deduct)
      const totalStock = batches.reduce(
        (sum, b) => sum + Number(b.remainingQty),
        0
      );

      if (totalStock < quantity) {
        throw new Error("Insufficient stock");
      }

      let remainingToDeduct = quantity;
      let totalCost = 0;

      for (const batch of batches) {
        if (remainingToDeduct <= 0) break;

        const available = Number(batch.remainingQty);
        const deductQty = Math.min(available, remainingToDeduct);

        await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: {
            remainingQty: available - deductQty,
          },
        });

        totalCost += deductQty * Number(batch.costPerUnit);
        remainingToDeduct -= deductQty;
      }

      // 📄 Create Stock Document (Waste)
      const stockDoc = await tx.stockDocument.create({
        data: {
          businessId,
          type: StockDocumentType.Waste,
          notes: notes ?? null,
        },
      });

      // 📦 Create Movement OUT
      await tx.inventoryMovement.create({
        data: {
          ingredientId,
          stockDocumentId: stockDoc.id,
          quantity,
          costPerUnit: totalCost / quantity,
          type: InventoryMovementType.Out,
        },
      });

      return stockDoc;
    });

    return NextResponse.json({ success: true, data: result });

  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to consume stock",
      },
      { status: 500 }
    );
  }
}