import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/session";

/**
 * GET /api/analytics/forecast-cached
 *
 * Returns the LAST computed ARIMA forecast stored in the DB without re-running the model.
 * The client should call POST /api/analytics/forecast to trigger a fresh computation.
 *
 * Response shape matches /api/analytics/forecast so the UI can use the same types.
 */
export async function GET() {
  try {
    const { businessId } = await requireAuth();

    // ─── Business forecast ──────────────────────────────────────────────
    const bizForecastRows = await prisma.businessForecast.findMany({
      where: { businessId },
      orderBy: { date: "asc" },
    });

    const businessForecast = bizForecastRows.map((r) => ({
      date: r.date.toISOString().split("T")[0],
      predictedRevenue: Number(r.predictedRevenue),
      predictedProfit: Number(r.predictedProfit ?? 0),
      lowerBound: Number(r.lowerBound),
      upperBound: Number(r.upperBound),
      confidenceScore: Number(r.confidenceScore),
    }));

    // ─── Product forecasts ──────────────────────────────────────────────
    // Fetch all ProductForecast rows for products belonging to this business
    const prodForecastRows = await prisma.productForecast.findMany({
      where: {
        product: { businessId },
      },
      include: {
        product: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" },
    });

    // Group by productId
    const productMap = new Map<
      number,
      {
        productId: number;
        productName: string;
        forecast: {
          date: string;
          predictedQty: number;
          lowerBound: number;
          upperBound: number;
          confidenceScore: number;
          recommendedProduction: string;
        }[];
        totalQty: number;
        dayCount: number;
      }
    >();

    for (const row of prodForecastRows) {
      const pid = row.product.id;
      if (!productMap.has(pid)) {
        productMap.set(pid, {
          productId: pid,
          productName: row.product.name,
          forecast: [],
          totalQty: 0,
          dayCount: 0,
        });
      }
      const entry = productMap.get(pid)!;
      entry.forecast.push({
        date: row.date.toISOString().split("T")[0],
        predictedQty: row.predictedQty,
        lowerBound: row.lowerBound,
        upperBound: row.upperBound,
        confidenceScore: Number(row.confidenceScore),
        recommendedProduction: row.recommendedProduction ?? "",
      });
      entry.totalQty += row.predictedQty;
      entry.dayCount++;
    }

    const productForecasts = [...productMap.values()].map((p) => ({
      productId: p.productId,
      productName: p.productName,
      forecast: p.forecast,
      avgDailyQty: p.dayCount > 0 ? Math.round(p.totalQty / p.dayCount) : 0,
    }));

    // ─── Metadata  ──────────────────────────────────────────────────────
    const lastComputed = bizForecastRows[0]?.updatedAt ?? null;

    return NextResponse.json({
      success: true,
      cached: true,
      lastComputed: lastComputed ? lastComputed.toISOString() : null,
      modelInfo: { arima: "ARIMA(1,1,1)", lookback: 30, horizon: 7 },
      businessForecast,
      productForecasts,
    });
  } catch (error) {
    if (isAuthError(error)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("GET /api/analytics/forecast-cached error:", error);
    return NextResponse.json({ error: "Failed to fetch cached forecast" }, { status: 500 });
  }
}
