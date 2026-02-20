import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/session";

export async function GET() {
  try {
    const { businessId } = await requireAuth();

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // =========================
    // 1️⃣ SALES TODAY (REAL DATA)
    // =========================
    const salesToday = await prisma.sale.findMany({
      where: {
        businessId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const todayRevenue = salesToday.reduce(
      (sum, s) => sum + Number(s.totalRevenue),
      0
    );

    const todayCost = salesToday.reduce(
      (sum, s) => sum + Number(s.totalCost),
      0
    );

    const todayProfit = todayRevenue - todayCost;
    const avgMargin =
      todayRevenue > 0 ? (todayProfit / todayRevenue) * 100 : 0;

    const transactionCount = salesToday.length;

    // =========================
    // 2️⃣ TOP SELLING PRODUCTS
    // =========================
    const topProductsRaw = await prisma.saleItem.groupBy({
      by: ["productId"],
      where: {
        sale: {
          businessId,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: 5,
    });

    const topProducts = await Promise.all(
      topProductsRaw.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true },
        });

        return {
          product,
          quantitySold: item._sum.quantity ?? 0,
        };
      })
    );

    // =========================
    // 3️⃣ LOW STOCK INGREDIENTS
    // =========================
    const ingredients = await prisma.ingredient.findMany({
      where: { businessId },
      include: {
        inventoryBatches: {
          where: { remainingQty: { gt: 0 } },
          select: { remainingQty: true },
        },
      },
    });

    const lowStockIngredients = ingredients
      .map((ingredient) => {
        const currentStock = ingredient.inventoryBatches.reduce(
          (sum, batch) => sum + Number(batch.remainingQty),
          0
        );

        return {
          id: ingredient.id,
          name: ingredient.name,
          currentStock,
          minStock: ingredient.minStock,
        };
      })
      .filter((item) => item.currentStock <= item.minStock);

    return NextResponse.json({
      success: true,
      data: {
        todayRevenue,
        todayProfit,
        avgMargin: Math.round(avgMargin * 100) / 100,
        transactionCount,
        topProducts,
        lowStockIngredients,
      },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Analytics dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}