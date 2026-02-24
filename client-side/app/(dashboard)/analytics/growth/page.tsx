// Redirected to consolidated analytics page
import { redirect } from "next/navigation";
export default function OldGrowthPage() {
  redirect("/analytics");
}
// "use client"; — original file content preserved below (unused)

import { useEffect, useState, useCallback } from "react";
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
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";

type Granularity = "24h" | "daily" | "monthly";

type HourlyPoint = { hour: string; revenue: number; profit: number; transactions: number };
type DailyPoint = { date: string; revenue: number; profit: number; growthRate: number };
type MonthlyPoint = { date: string; revenue: number; profit: number };

type GrowthComparison = {
  currentRevenue: number;
  prevRevenue: number;
  revenueGrowth: number;
  currentProfit: number;
  prevProfit: number;
  profitGrowth: number;
};

function GrowthBadge({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={`flex items-center gap-1 text-sm font-semibold ${up ? "text-green-600" : "text-red-500"}`}>
      {up ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export default function GrowthPage() {
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [hourlyData, setHourlyData] = useState<HourlyPoint[]>([]);
  const [dailyData, setDailyData] = useState<DailyPoint[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyPoint[]>([]);
  const [growth, setGrowth] = useState<GrowthComparison | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGranularity = useCallback(async (g: Granularity) => {
    setLoading(true);
    try {
      if (g === "24h") {
        const res = await fetch("/api/analytics/hourly");
        const json = await res.json();
        setHourlyData(json.data ?? []);
      } else if (g === "daily") {
        const now = new Date();
        const from = new Date(now);
        from.setDate(from.getDate() - 29);
        const res = await fetch(`/api/analytics/daily?from=${from.toISOString()}&to=${now.toISOString()}`);
        const json = await res.json();
        setDailyData(json.data ?? []);
      } else {
        const now = new Date();
        const months: MonthlyPoint[] = [];
        for (let i = 5; i >= 0; i--) {
          const y = new Date(now.getFullYear(), now.getMonth() - i).getFullYear();
          const m = new Date(now.getFullYear(), now.getMonth() - i).getMonth() + 1;
          const res = await fetch(`/api/analytics/monthly?year=${y}&month=${m}`);
          const json = await res.json();
          if (json.data) {
            const monthRevenue = json.data.reduce((s: number, d: MonthlyPoint) => s + d.revenue, 0);
            const monthProfit = json.data.reduce((s: number, d: MonthlyPoint) => s + d.profit, 0);
            months.push({
              date: `${y}-${String(m).padStart(2, "0")}`,
              revenue: monthRevenue,
              profit: monthProfit,
            });
          }
        }
        setMonthlyData(months);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  async function fetchGrowth() {
    try {
      const now = new Date();
      const res = await fetch(`/api/analytics/growth?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
      const json = await res.json();
      if (json.data) setGrowth(json.data);
    } catch {
      /* non-critical */
    }
  }

  useEffect(() => {
    fetchGrowth();
    fetchGranularity(granularity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleGranularity(g: Granularity) {
    setGranularity(g);
    fetchGranularity(g);
  }

  // Format monthly label
  const monthlyChartData = monthlyData.map((d) => ({
    ...d,
    label: new Date(d.date + "-01").toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
  }));

  const dailyChartData = dailyData.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
  }));

  return (
    <div className="min-h-screen py-10 px-2 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-indigo-700 flex items-center gap-2">
            <TrendingUp className="w-8 h-8" /> Growth Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">Revenue & profit trends across time</p>
        </div>

        {/* MoM comparison cards */}
        {growth && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Revenue Growth (MoM)</p>
                  <p className="text-3xl font-bold text-indigo-700 mt-1">
                    Rp {growth.currentRevenue.toLocaleString("id-ID")}
                  </p>
                  <p className="text-sm text-gray-400 mt-0.5">
                    vs Rp {growth.prevRevenue.toLocaleString("id-ID")} last month
                  </p>
                </div>
                <GrowthBadge value={growth.revenueGrowth} />
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Profit Growth (MoM)</p>
                  <p className="text-3xl font-bold text-green-700 mt-1">
                    Rp {growth.currentProfit.toLocaleString("id-ID")}
                  </p>
                  <p className="text-sm text-gray-400 mt-0.5">
                    vs Rp {growth.prevProfit.toLocaleString("id-ID")} last month
                  </p>
                </div>
                <GrowthBadge value={growth.profitGrowth} />
              </div>
            </div>
          </div>
        )}

        {/* Granularity switcher */}
        <div className="flex gap-2">
          {(["24h", "daily", "monthly"] as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => handleGranularity(g)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                granularity === g
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50"
              }`}
            >
              {g === "24h" ? "Last 24h" : g === "daily" ? "Last 30 Days" : "Monthly (6mo)"}
            </button>
          ))}
        </div>

        {/* Charts */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow p-16 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Revenue + Profit area chart */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-indigo-700 mb-4">
                {granularity === "24h"
                  ? "Revenue — Last 24 Hours"
                  : granularity === "daily"
                    ? "Revenue & Profit — Last 30 Days"
                    : "Revenue & Profit — Last 6 Months"}
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={
                    granularity === "24h"
                      ? hourlyData.map((d) => ({ ...d, label: d.hour }))
                      : granularity === "daily"
                        ? dailyChartData
                        : monthlyChartData
                  }
                >
                  <defs>
                    <linearGradient id="gRevGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gProfGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey={granularity === "24h" ? "label" : "label"}
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    interval={granularity === "24h" ? 3 : granularity === "daily" ? 4 : 0}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: unknown, name: string) => [
                      `Rp ${Number(value).toLocaleString("id-ID")}`,
                      name === "revenue" ? "Revenue" : "Profit",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#gRevGrowth)"
                    name="revenue"
                    dot={false}
                  />
                  {granularity !== "24h" && (
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#gProfGrowth)"
                      name="profit"
                      dot={false}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Growth rate line chart — only for daily view */}
            {granularity === "daily" && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-indigo-700 mb-4">Daily Growth Rate (%)</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      interval={4}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v.toFixed(0)}%`}
                    />
                    <Tooltip formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, "Growth Rate"]} />
                    <ReferenceLine y={0} stroke="#e5e7eb" />
                    <Line
                      type="monotone"
                      dataKey="growthRate"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      name="growthRate"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Hourly transactions bar */}
            {granularity === "24h" && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-indigo-700 mb-4">Transactions per Hour</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={hourlyData.map((d) => ({ ...d, label: d.hour }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      interval={3}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: unknown) => [`${v}`, "Transactions"]} />
                    <Bar dataKey="transactions" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
