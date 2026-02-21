import prisma from "@/lib/prisma";

/**
 * Recomputes and stores the `recipeCost` for a product based on current
 * weighted-average inventory batch costs. Call after recipe rows are
 * created, updated, or deleted for a product.
 */
export async function recomputeRecipeCost(productId: number): Promise<void> {
  const recipes = await prisma.recipe.findMany({
    where: { productId },
    include: {
      ingredient: {
        include: {
          inventoryBatches: {
            where: { remainingQty: { gt: 0 } },
            select: { costPerUnit: true, remainingQty: true },
          },
        },
      },
    },
  });

  const recipeCost = recipes.reduce((sum, r) => {
    const batches = r.ingredient.inventoryBatches;
    const currentStock = batches.reduce((s, b) => s + Number(b.remainingQty), 0);
    const totalCost = batches.reduce((s, b) => s + Number(b.remainingQty) * Number(b.costPerUnit), 0);
    const costPerUnit = currentStock > 0 ? totalCost / currentStock : batches[0] ? Number(batches[0].costPerUnit) : 0;
    return sum + Number(r.quantity) * costPerUnit;
  }, 0);

  await prisma.$executeRawUnsafe(
    `UPDATE "Product" SET "recipeCost" = $1, "updatedAt" = NOW() WHERE id = $2`,
    Math.round(recipeCost * 100) / 100,
    productId,
  );
}
