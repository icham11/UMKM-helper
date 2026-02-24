// Redirected to consolidated analytics page
import { redirect } from "next/navigation";
export default function OldForecastPage() {
  redirect("/analytics");
}
// "use client"; — original file content preserved below (unused)

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { TrendingUp, Package, RefreshCw, Info } from "lucide-react";

type BizForecastDay = {
  date: string;
  predictedRevenue: number;
  lowerBound: number;
  upperBound: number;
  confidenceScore: number;
};

type ProductForecastDay = {
  date: string;
  predictedQty: number;
  lowerBound: number;
  upperBound: number;
  confidenceScore: number;
  recommendedProduction: string;
};

type ProductForecastResult = {
  productId: number;
  productName: string;
  forecast: ProductForecastDay[];
  avgDailyQty: number;
};

type ForecastData = {
  modelInfo: { arima: string; lookback: number; horizon: number };
  businessForecast: BizForecastDay[];
  productForecasts: ProductForecastResult[];
};

const CONFIDENCE_COLOR = (score: number) =>
  score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-500";

function ConfidenceBadge({ score }: { score: number }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
        score >= 80
          ? "bg-green-100 text-green-700"
          : score >= 60
            ? "bg-yellow-100 text-yellow-700"
            : "bg-red-100 text-red-500"
      }`}
    >
      {score}%
    </span>
  );
}

export default function ForecastPage() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"revenue" | "demand">("revenue");
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);

  async function fetchForecast() {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/forecast");
      if (!res.ok) throw new Error("Failed to fetch forecast");
      const json = await res.json();
      setData(json);
      if (json.productForecasts?.length > 0) {
        setSelectedProduct(json.productForecasts[0].productId);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Forecast failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchForecast();
  }, []);

  const selectedProd = data?.productForecasts.find((p) => p.productId === selectedProduct);

  // Format biz forecast for recharts (area needs stacked lower + spread)
  const bizChartData = (data?.businessForecast ?? []).map((d) => ({
    date: new Date(d.date).toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
    }),
    predicted: d.predictedRevenue,
    lower: d.lowerBound,
    upper: d.upperBound,
    spread: d.upperBound - d.lowerBound,
    confidence: d.confidenceScore,
  }));

  const prodChartData = (selectedProd?.forecast ?? []).map((d) => ({
    date: new Date(d.date).toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
    }),
    predicted: d.predictedQty,
    lower: d.lowerBound,
    upper: d.upperBound,
    confidence: d.confidenceScore,
  }));

  return (
    <div className="min-h-screen py-10 px-2 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-indigo-700 flex items-center gap-2">
              <TrendingUp className="w-8 h-8" /> Forecast
            </h1>
            <p className="text-sm text-gray-500 mt-1">ARIMA(1,1,1) · 30-day lookback · 7-day horizon</p>
          </div>
          <button
            onClick={fetchForecast}
            disabled={loading}
            className="flex items-center gap-2 text-sm bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-indigo-50 transition text-indigo-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Recalculate
          </button>
        </div>

        {/* Model info banner */}
        {data && (
          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-700">
            <Info className="w-4 h-4 shrink-0" />
            <span>
              Model: <strong>{data.modelInfo.arima}</strong> · Lookback: <strong>{data.modelInfo.lookback} days</strong>{" "}
              · Horizon: <strong>{data.modelInfo.horizon} days</strong> · Confidence bands at 95% CI
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {(["revenue", "demand"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                tab === t
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50"
              }`}
            >
              {t === "revenue" ? "Revenue Projection" : "Demand Forecast"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow p-16 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 text-sm">Running ARIMA model…</p>
            </div>
          </div>
        ) : !data ? null : tab === "revenue" ? (
          /* ── REVENUE PROJECTION TAB ─────────────────────────────────── */
          <div className="space-y-6">
            {bizChartData.length === 0 ? (
              <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400">
                Not enough historical data (need ≥5 days) to run forecast.
              </div>
            ) : (
              <>
                {/* Chart */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h2 className="text-lg font-bold text-indigo-700 mb-4">7-Day Revenue Projection</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={bizChartData}>
                      <defs>
                        <linearGradient id="gPred" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gBand" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a5b4fc" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#a5b4fc" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value: unknown, name: string) => {
                          const labels: Record<string, string> = {
                            predicted: "Predicted",
                            upper: "Upper Bound",
                            lower: "Lower Bound",
                          };
                          return [`Rp ${Number(value).toLocaleString("id-ID")}`, labels[name] ?? name];
                        }}
                      />
                      {/* Confidence band */}
                      <Area
                        type="monotone"
                        dataKey="upper"
                        stroke="#a5b4fc"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                        fill="url(#gBand)"
                        name="upper"
                      />
                      <Area
                        type="monotone"
                        dataKey="lower"
                        stroke="#a5b4fc"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                        fill="white"
                        name="lower"
                      />
                      {/* Predicted line */}
                      <Area
                        type="monotone"
                        dataKey="predicted"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fill="url(#gPred)"
                        name="predicted"
                        dot={{ r: 4, fill: "#6366f1" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div className="p-5 border-b border-gray-100">
                    <h2 className="font-bold text-indigo-700">Daily Breakdown</h2>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-indigo-50 text-indigo-700">
                      <tr>
                        <th className="text-left px-6 py-3 font-semibold">Date</th>
                        <th className="text-right px-6 py-3 font-semibold">Lower</th>
                        <th className="text-right px-6 py-3 font-semibold">Predicted</th>
                        <th className="text-right px-6 py-3 font-semibold">Upper</th>
                        <th className="text-right px-6 py-3 font-semibold">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.businessForecast.map((d, i) => (
                        <tr
                          key={d.date}
                          className={`border-b border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-indigo-50/40"}`}
                        >
                          <td className="px-6 py-3 font-medium text-gray-700">
                            {new Date(d.date).toLocaleDateString("id-ID", {
                              weekday: "long",
                              day: "numeric",
                              month: "short",
                            })}
                          </td>
                          <td className="px-6 py-3 text-right text-gray-500">
                            Rp {d.lowerBound.toLocaleString("id-ID")}
                          </td>
                          <td className="px-6 py-3 text-right font-bold text-indigo-700">
                            Rp {d.predictedRevenue.toLocaleString("id-ID")}
                          </td>
                          <td className="px-6 py-3 text-right text-gray-500">
                            Rp {d.upperBound.toLocaleString("id-ID")}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <ConfidenceBadge score={d.confidenceScore} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        ) : (
          /* ── DEMAND FORECAST TAB ────────────────────────────────────── */
          <div className="space-y-6">
            {data.productForecasts.length === 0 ? (
              <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400">
                Not enough sales data per product (need ≥5 days with sales) to forecast.
              </div>
            ) : (
              <>
                {/* Product selector */}
                <div className="flex flex-wrap gap-2">
                  {data.productForecasts.map((p) => (
                    <button
                      key={p.productId}
                      onClick={() => setSelectedProduct(p.productId)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                        selectedProduct === p.productId
                          ? "bg-indigo-600 text-white shadow"
                          : "bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50"
                      }`}
                    >
                      {p.productName}
                    </button>
                  ))}
                </div>

                {selectedProd && (
                  <>
                    {/* Avg daily */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
                      <div className="p-3 bg-indigo-100 rounded-xl">
                        <Package className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Avg Daily Sales (last 30d)</p>
                        <p className="text-2xl font-bold text-indigo-700">{selectedProd.avgDailyQty} units</p>
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                      <h2 className="text-lg font-bold text-indigo-700 mb-4">
                        7-Day Demand Forecast — {selectedProd.productName}
                      </h2>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={prodChartData} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: "#9ca3af" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                          <Tooltip
                            formatter={(value: unknown, name: string) => {
                              const labels: Record<string, string> = {
                                predicted: "Predicted Qty",
                                upper: "Upper Bound",
                                lower: "Lower Bound",
                              };
                              return [`${value} units`, labels[name] ?? name];
                            }}
                          />
                          <ReferenceLine
                            y={selectedProd.avgDailyQty}
                            stroke="#e5e7eb"
                            strokeDasharray="4 4"
                            label={{
                              value: "Avg",
                              position: "right",
                              fontSize: 10,
                              fill: "#9ca3af",
                            }}
                          />
                          <Bar dataKey="lower" fill="#e0e7ff" radius={[4, 4, 0, 0]} name="lower" />
                          <Bar dataKey="predicted" fill="#6366f1" radius={[4, 4, 0, 0]} name="predicted" />
                          <Bar dataKey="upper" fill="#c7d2fe" radius={[4, 4, 0, 0]} name="upper" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                      <div className="p-5 border-b border-gray-100">
                        <h2 className="font-bold text-indigo-700">
                          Production Recommendation — {selectedProd.productName}
                        </h2>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="bg-indigo-50 text-indigo-700">
                          <tr>
                            <th className="text-left px-6 py-3 font-semibold">Date</th>
                            <th className="text-right px-6 py-3 font-semibold">Lower</th>
                            <th className="text-right px-6 py-3 font-semibold">Predicted</th>
                            <th className="text-right px-6 py-3 font-semibold">Upper</th>
                            <th className="text-right px-6 py-3 font-semibold">Confidence</th>
                            <th className="text-left px-6 py-3 font-semibold">Recommendation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProd.forecast.map((d, i) => (
                            <tr
                              key={d.date}
                              className={`border-b border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-indigo-50/40"}`}
                            >
                              <td className="px-6 py-3 font-medium text-gray-700">
                                {new Date(d.date).toLocaleDateString("id-ID", {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "short",
                                })}
                              </td>
                              <td className="px-6 py-3 text-right text-gray-500">{d.lowerBound}</td>
                              <td className="px-6 py-3 text-right font-bold text-indigo-700">{d.predictedQty}</td>
                              <td className="px-6 py-3 text-right text-gray-500">{d.upperBound}</td>
                              <td className="px-6 py-3 text-right">
                                <ConfidenceBadge score={d.confidenceScore} />
                              </td>
                              <td className="px-6 py-3 text-gray-600 text-xs">{d.recommendedProduction}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
