import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;;

export async function simulateFIFOCost(
  tx: Tx,
  ingredientId: number,
  requiredQty: number
): Promise<{
  totalCost: number;
  breakdown: { batchId: number; quantity: number; costPerUnit: number }[];
}> {
  const batches = await tx.inventoryBatch.findMany({
    where: {
      ingredientId,
      remainingQty: { gt: 0 },
    },
    orderBy: { receivedAt: "asc" }, // FIFO
  });

  let remaining = requiredQty;
  let totalCost = 0;

  const breakdown: {
    batchId: number;
    quantity: number;
    costPerUnit: number;
  }[] = [];

  for (const batch of batches) {
    if (remaining <= 0) break;

    const available = Number(batch.remainingQty);
    const takeQty = Math.min(available, remaining);

    totalCost += takeQty * Number(batch.costPerUnit);

    breakdown.push({
      batchId: batch.id,
      quantity: takeQty,
      costPerUnit: Number(batch.costPerUnit),
    });

    remaining -= takeQty;
  }

  if (remaining > 0) {
    throw new Error("Insufficient stock");
  }

  return { totalCost, breakdown };
}

export async function deductFIFO(
  tx: Tx,
  ingredientId: number,
  breakdown: { batchId: number; quantity: number; costPerUnit: number }[],
  stockDocumentId: number
) {
  for (const item of breakdown) {
    const batch = await tx.inventoryBatch.findUnique({
      where: { id: item.batchId },
    });

    if (!batch) continue;

    await tx.inventoryBatch.update({
      where: { id: item.batchId },
      data: {
        remainingQty: Number(batch.remainingQty) - item.quantity,
      },
    });

    await tx.inventoryMovement.create({
      data: {
        ingredientId,
        stockDocumentId,
        quantity: item.quantity,
        costPerUnit: item.costPerUnit,
        type: "Out",
      },
    });
  }
}