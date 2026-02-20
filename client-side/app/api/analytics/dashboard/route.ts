import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/session";

export async function GET() {
  try {
    const { businessId } = await requireAuth();

    const today = new Date();
    const dateOnly = new Date(today.toISOString().split("T")[0]);

    // =========================
    // 1️⃣ Today Business Metrics
    // =========================
    const todayMetrics = await prisma.businessMetrics.findUnique({
      where: {
        businessId_date: {
          businessId,
          date: dateOnly,
        },
      },
    });

    const todayRevenue = Number(todayMetrics?.totalRevenue ?? 0);
    const todayProfit = Number(todayMetrics?.totalProfit ?? 0);

    // =========================
    // 2️⃣ Transaction Count Today
    // =========================
    const transactionCount = await prisma.sale.count({
      where: {
        businessId,
        createdAt: {
          gte: dateOnly,
        },
      },
    });

    // =========================
    // 3️⃣ Top Selling Products Today
    // =========================
    const topProducts = await prisma.productMetrics.findMany({
      where: {
        date: dateOnly,
        product: {
          businessId,
        },
      },
      orderBy: {
        quantitySold: "desc",
      },
      take: 5,
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // =========================
    // 4️⃣ Low Stock Ingredients
    // =========================
    const ingredients = await prisma.ingredient.findMany({
      where: { businessId },
      include: {
        inventoryBatches: {
          where: {
            remainingQty: { gt: 0 },
          },
          select: {
            remainingQty: true,
          },
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
        transactionCount,
        topProducts,
        lowStockIngredients,
      },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}