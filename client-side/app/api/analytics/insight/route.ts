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

    const insights: string[] = [];

    if (totalRevenue > 100000) {
      insights.push("Revenue bulan ini sudah melewati 100 ribu. Pertumbuhan bagus.");
    } else {
      insights.push("Revenue masih rendah. Perlu strategi promosi.");
    }

    if (margin > 40) {
      insights.push("Margin sangat sehat di atas 40%.");
    } else if (margin > 25) {
      insights.push("Margin cukup stabil.");
    } else {
      insights.push("Margin rendah. Cek cost bahan atau harga jual.");
    }

    if (metrics.length < 5) {
      insights.push("Transaksi masih sedikit. Perlu tingkatkan volume penjualan.");
    } else {
      insights.push("Aktivitas penjualan stabil.");
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalProfit,
        margin: Math.round(margin * 100) / 100,
        insights,
      },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}