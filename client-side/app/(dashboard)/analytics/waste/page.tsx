// Redirected to consolidated analytics page
import { redirect } from "next/navigation";
export default function OldWastePage() {
  redirect("/analytics");
}
// "use client"; — original file content preserved below (unused)

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Trash2 } from "lucide-react";

type WasteData = {
  totalWasteQty: number;
  totalWasteCost: number;
  wastePercentage: number;
};

const now = new Date();

function monthLabel(offset: number) {
  const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

const MONTHS = [
  { year: now.getFullYear(), month: now.getMonth() + 1, label: "This Month" },
  {
    year: new Date(now.getFullYear(), now.getMonth() - 1).getFullYear(),
    month: new Date(now.getFullYear(), now.getMonth() - 1).getMonth() + 1,
    label: monthLabel(1),
  },
  {
    year: new Date(now.getFullYear(), now.getMonth() - 2).getFullYear(),
    month: new Date(now.getFullYear(), now.getMonth() - 2).getMonth() + 1,
    label: monthLabel(2),
  },
  {
    year: new Date(now.getFullYear(), now.getMonth() - 3).getFullYear(),
    month: new Date(now.getFullYear(), now.getMonth() - 3).getMonth() + 1,
    label: monthLabel(3),
  },
  {
    year: new Date(now.getFullYear(), now.getMonth() - 4).getFullYear(),
    month: new Date(now.getFullYear(), now.getMonth() - 4).getMonth() + 1,
    label: monthLabel(4),
  },
  {
    year: new Date(now.getFullYear(), now.getMonth() - 5).getFullYear(),
    month: new Date(now.getFullYear(), now.getMonth() - 5).getMonth() + 1,
    label: monthLabel(5),
  },
];

export default function WastePage() {
  const [selected, setSelected] = useState(0);
  const [data, setData] = useState<WasteData | null>(null);
  const [trendData, setTrendData] = useState<{ label: string; cost: number; pct: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      // Fetch current selected month + trend (all 6 months)
      const [currentRes, ...trendRes] = await Promise.all(
        MONTHS.map((m) => fetch(`/api/analytics/waste?year=${m.year}&month=${m.month}`).then((r) => r.json())),
      );
      setData(currentRes.data ?? null);

      const trend = [currentRes, ...trendRes].map((r, i) => ({
        label: MONTHS[i].label === "This Month" ? "Now" : MONTHS[i].label.split(" ")[0],
        cost: r.data?.totalWasteCost ?? 0,
        pct: r.data?.wastePercentage ?? 0,
      }));
      setTrendData(trend.reverse());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMonth(idx: number) {
    setSelected(idx);
    setLoading(true);
    try {
      const m = MONTHS[idx];
      const res = await fetch(`/api/analytics/waste?year=${m.year}&month=${m.month}`);
      const json = await res.json();
      setData(json.data ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen py-10 px-2 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-red-600 flex items-center gap-2">
            <Trash2 className="w-8 h-8" /> Waste Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">Waste quantity, cost, and percentage of revenue</p>
        </div>

        {/* Month selector */}
        <div className="flex flex-wrap gap-2">
          {MONTHS.map((m, i) => (
            <button
              key={i}
              onClick={() => fetchMonth(i)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                selected === i
                  ? "bg-red-500 text-white shadow"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-red-50"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow p-6 animate-pulse h-28" />
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm text-gray-500">Total Waste Qty</p>
              <p className="text-3xl font-bold text-red-500 mt-2">{data.totalWasteQty.toFixed(2)} units</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm text-gray-500">Waste Cost</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                Rp {data.totalWasteCost.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm text-gray-500">Waste % of Revenue</p>
              <p
                className={`text-3xl font-bold mt-2 ${
                  data.wastePercentage > 10
                    ? "text-red-600"
                    : data.wastePercentage > 5
                      ? "text-yellow-600"
                      : "text-green-600"
                }`}
              >
                {data.wastePercentage}%
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {data.wastePercentage > 10
                  ? "⚠ High — investigate waste sources"
                  : data.wastePercentage > 5
                    ? "Moderate — monitor closely"
                    : "✓ Within acceptable range"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No waste data for this period.</p>
        )}

        {/* Trend chart — last 6 months */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6">6-Month Waste Cost Trend</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trendData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: unknown, name: string) => {
                  if (name === "cost") return [`Rp ${Number(value).toLocaleString("id-ID")}`, "Waste Cost"];
                  return [`${value}%`, "Waste %"];
                }}
              />
              <Bar dataKey="cost" radius={[6, 6, 0, 0]} name="cost">
                {trendData.map((entry, i) => (
                  <Cell key={i} fill={entry.pct > 10 ? "#ef4444" : entry.pct > 5 ? "#f97316" : "#22c55e"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Waste % labels */}
          <div className="flex justify-around mt-2">
            {trendData.map((d, i) => (
              <div key={i} className="text-center">
                <span
                  className={`text-xs font-semibold ${
                    d.pct > 10 ? "text-red-500" : d.pct > 5 ? "text-orange-500" : "text-green-600"
                  }`}
                >
                  {d.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500 inline-block" /> ≤5% — Healthy
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-orange-500 inline-block" /> 5–10% — Moderate
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500 inline-block" /> &gt;10% — High
          </span>
        </div>
      </div>
    </div>
  );
}
