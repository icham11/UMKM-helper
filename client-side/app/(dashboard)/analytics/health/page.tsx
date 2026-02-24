// Redirected to consolidated analytics page
import { redirect } from "next/navigation";
export default function OldHealthPage() {
  redirect("/analytics");
}
// "use client"; — original file content preserved below (unused)

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { HeartPulse, RefreshCw } from "lucide-react";

type HealthPoint = {
  date: string;
  revenueScore: number;
  profitScore: number;
  wasteScore: number;
  stabilityScore: number;
  overallScore: number;
  classification: string;
};

const SCORE_LINES = [
  { key: "overallScore", label: "Overall", color: "#6366f1" },
  { key: "revenueScore", label: "Revenue", color: "#10b981" },
  { key: "profitScore", label: "Profit", color: "#f59e0b" },
  { key: "wasteScore", label: "Waste", color: "#ef4444" },
  { key: "stabilityScore", label: "Stability", color: "#8b5cf6" },
];

function classColors(cls: string) {
  switch (cls) {
    case "Excellent":
      return "bg-green-100 text-green-700";
    case "Good":
      return "bg-blue-100 text-blue-700";
    case "Warning":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-red-100 text-red-600";
  }
}

function GaugeBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>
          {value.toFixed(1)}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function HealthPage() {
  const [series, setSeries] = useState<HealthPoint[]>([]);
  const [latest, setLatest] = useState<HealthPoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  async function fetchData(d = days) {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/health?days=${d}`);
      if (!res.ok) throw new Error("Failed to fetch health scores");
      const json = await res.json();
      setSeries(json.data ?? []);
      setLatest(json.latest ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartData = series.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
  }));

  return (
    <div className="min-h-screen py-10 px-2 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-indigo-700 flex items-center gap-2">
              <HeartPulse className="w-8 h-8" /> Business Health
            </h1>
            <p className="text-sm text-gray-500 mt-1">Sub-score trends over time</p>
          </div>
          <div className="flex items-center gap-2">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDays(d);
                  fetchData(d);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                  days === d
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50"
                }`}
              >
                {d}d
              </button>
            ))}
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm bg-white border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-indigo-50 transition text-indigo-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Latest snapshot gauges */}
        {latest && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-800">Current Snapshot</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${classColors(latest.classification)}`}>
                  {latest.classification}
                </span>
              </div>
              <div className="space-y-3">
                {SCORE_LINES.map((s) => (
                  <GaugeBar
                    key={s.key}
                    label={s.label}
                    value={latest[s.key as keyof HealthPoint] as number}
                    color={s.color}
                  />
                ))}
              </div>
            </div>

            {/* Grid of score cards */}
            <div className="grid grid-cols-2 gap-3">
              {SCORE_LINES.map((s) => {
                const val = latest[s.key as keyof HealthPoint] as number;
                return (
                  <div key={s.key} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 mb-1">{s.label} Score</p>
                    <p className="text-2xl font-bold" style={{ color: s.color }}>
                      {val.toFixed(1)}
                    </p>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, val)}%`, backgroundColor: s.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Line chart */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-indigo-700 mb-6">Score Trends</h2>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : chartData.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No health score data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                {SCORE_LINES.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Classification history */}
        {series.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-bold text-indigo-700">Classification History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-indigo-50 text-indigo-700">
                  <tr>
                    <th className="text-left px-6 py-3">Date</th>
                    <th className="text-right px-6 py-3">Overall</th>
                    <th className="text-right px-6 py-3">Revenue</th>
                    <th className="text-right px-6 py-3">Profit</th>
                    <th className="text-right px-6 py-3">Waste</th>
                    <th className="text-right px-6 py-3">Stability</th>
                    <th className="text-center px-6 py-3">Classification</th>
                  </tr>
                </thead>
                <tbody>
                  {[...series]
                    .reverse()
                    .slice(0, 14)
                    .map((d, i) => (
                      <tr
                        key={d.date}
                        className={`border-b border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-indigo-50/30"}`}
                      >
                        <td className="px-6 py-2.5 font-medium text-gray-700">
                          {new Date(d.date).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "2-digit",
                          })}
                        </td>
                        <td className="px-6 py-2.5 text-right font-bold text-indigo-700">
                          {d.overallScore.toFixed(1)}
                        </td>
                        <td className="px-6 py-2.5 text-right text-gray-600">{d.revenueScore.toFixed(1)}</td>
                        <td className="px-6 py-2.5 text-right text-gray-600">{d.profitScore.toFixed(1)}</td>
                        <td className="px-6 py-2.5 text-right text-gray-600">{d.wasteScore.toFixed(1)}</td>
                        <td className="px-6 py-2.5 text-right text-gray-600">{d.stabilityScore.toFixed(1)}</td>
                        <td className="px-6 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${classColors(d.classification)}`}
                          >
                            {d.classification}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
