// Redirected to consolidated analytics page
import { redirect } from "next/navigation";
export default function OldDebtsPage() {
  redirect("/analytics");
}
// "use client"; — original file content preserved below (unused)

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { BookOpen, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

type Summary = {
  totalOutstanding: number;
  totalPaid: number;
  collectionRate: number;
  overdueCount: number;
  totalDebtors: number;
};

type TrendPoint = { month: string; collected: number; count: number };

type TopDebtor = {
  customerName: string;
  customerPhone: string | null;
  outstanding: number;
  dueDate: string | null;
  isOverdue: boolean;
  status: string;
};

export default function DebtAnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [topDebtors, setTopDebtors] = useState<TopDebtor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/debts-stats");
      if (!res.ok) throw new Error("Failed to fetch debt analytics");
      const json = await res.json();
      setSummary(json.summary ?? null);
      setTrend(json.trend ?? []);
      setTopDebtors(json.topOutstanding ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const collectionColor =
    (summary?.collectionRate ?? 0) >= 80
      ? "text-green-600"
      : (summary?.collectionRate ?? 0) >= 50
        ? "text-yellow-600"
        : "text-red-500";

  return (
    <div className="min-h-screen py-10 px-2 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-amber-700 flex items-center gap-2">
            <BookOpen className="w-8 h-8" /> Kasbon Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">Debt collection, outstanding balances, and payment trends</p>
        </div>

        {/* Summary cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow p-6 animate-pulse h-28" />
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 col-span-2 md:col-span-1">
              <p className="text-sm text-gray-500">Outstanding</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                Rp {summary.totalOutstanding.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500">Total Paid</p>
              <p className="text-2xl font-bold text-green-600 mt-1">Rp {summary.totalPaid.toLocaleString("id-ID")}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500">Collection Rate</p>
              <p className={`text-2xl font-bold mt-1 ${collectionColor}`}>{summary.collectionRate}%</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500">Overdue</p>
              <p className={`text-2xl font-bold mt-1 ${summary.overdueCount > 0 ? "text-red-600" : "text-gray-700"}`}>
                {summary.overdueCount}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500">Active Debtors</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{summary.totalDebtors}</p>
            </div>
          </div>
        ) : null}

        {/* Collection rate bar */}
        {summary && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-800">Collection Rate</h2>
              <span className={`text-lg font-bold ${collectionColor}`}>{summary.collectionRate}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4">
              <div
                className="h-4 rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, summary.collectionRate)}%`,
                  backgroundColor:
                    summary.collectionRate >= 80 ? "#22c55e" : summary.collectionRate >= 50 ? "#f59e0b" : "#ef4444",
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {/* Payment trend */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-amber-700 mb-4">Monthly Collection Trend</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trend} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: unknown, name: string) => {
                  if (name === "collected") return [`Rp ${Number(value).toLocaleString("id-ID")}`, "Collected"];
                  return [`${value}`, "Payments"];
                }}
              />
              <Bar dataKey="collected" radius={[6, 6, 0, 0]} name="collected">
                {trend.map((_, i) => (
                  <Cell key={i} fill={i === trend.length - 1 ? "#f59e0b" : "#6366f1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top outstanding debtors */}
        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-bold text-amber-700">Top Outstanding Customers</h2>
          </div>
          {topDebtors.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-400">All debts are settled! 🎉</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-amber-50 text-amber-700">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold">Customer</th>
                    <th className="text-left px-6 py-3 font-semibold">Phone</th>
                    <th className="text-right px-6 py-3 font-semibold">Outstanding</th>
                    <th className="text-center px-6 py-3 font-semibold">Due Date</th>
                    <th className="text-center px-6 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topDebtors.map((d, i) => (
                    <tr key={i} className={`border-b border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-amber-50/30"}`}>
                      <td className="px-6 py-3 font-semibold text-gray-800">{d.customerName}</td>
                      <td className="px-6 py-3 text-gray-500">{d.customerPhone ?? "—"}</td>
                      <td className="px-6 py-3 text-right font-bold text-amber-700">
                        Rp {d.outstanding.toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-3 text-center text-gray-500">
                        {d.dueDate
                          ? new Date(d.dueDate).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {d.isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs font-semibold">
                            <AlertTriangle className="w-3 h-3" /> Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                            <Clock className="w-3 h-3" /> {d.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
