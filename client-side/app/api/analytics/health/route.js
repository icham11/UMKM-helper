import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/session";

export async function GET() {
  try {
    const { businessId } = await requireAuth();

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const metrics = await prisma.businessMetrics.findMany({
      where: {
        businessId,
        date: {
          gte: firstDay,
          lte: lastDay,
        },
      },
    });

    const totalRevenue = metrics.reduce((sum, m) => sum + Number(m.totalRevenue), 0);
    const totalProfit = metrics.reduce((sum, m) => sum + Number(m.totalProfit), 0);

    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const revenueScore = totalRevenue > 100000 ? 25 : 15;
    const profitScore = margin > 40 ? 25 : 15;
    const wasteScore = margin > 30 ? 25 : 10;
    const stabilityScore = metrics.length > 5 ? 25 : 15;

    const overallScore =
      revenueScore + profitScore + wasteScore + stabilityScore;

    let classification = "Critical";

    if (overallScore >= 80) classification = "Excellent";
    else if (overallScore >= 60) classification = "Healthy";
    else if (overallScore >= 40) classification = "Warning";

    return NextResponse.json({
      success: true,
      data: {
        revenueScore,
        profitScore,
        wasteScore,
        stabilityScore,
        overallScore,
        classification,
      },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to calculate health score" },
      { status: 500 }
    );
  }
}