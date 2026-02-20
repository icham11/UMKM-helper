import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/session";
import { InventoryMovementType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { businessId } = await requireAuth();

    const url = new URL(request.url);
    const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
    const month = Number(url.searchParams.get("month")) || new Date().getMonth() + 1;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // ======================
    // 1️⃣ Get Waste Movements
    // ======================
    const wasteMovements = await prisma.inventoryMovement.findMany({
      where: {
        type: InventoryMovementType.Out,
        stockDocument: {
          businessId,
          type: "Waste",
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalWasteQty = wasteMovements.reduce(
      (sum, m) => sum + Number(m.quantity),
      0
    );

    const totalWasteCost = wasteMovements.reduce(
      (sum, m) => sum + Number(m.quantity) * Number(m.costPerUnit),
      0
    );

    // ======================
    // 2️⃣ Get Revenue for Month
    // ======================
    const monthlyRevenue = await prisma.businessMetrics.findMany({
      where: {
        businessId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalRevenue = monthlyRevenue.reduce(
      (sum, m) => sum + Number(m.totalRevenue),
      0
    );

    const wastePercentage =
      totalRevenue > 0
        ? (totalWasteCost / totalRevenue) * 100
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalWasteQty,
        totalWasteCost,
        wastePercentage: Math.round(wastePercentage * 100) / 100,
      },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Waste analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch waste analytics" },
      { status: 500 }
    );
  }
}