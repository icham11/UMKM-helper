"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useDateRange } from "@/context/DateRangeContext";

type ProductAnalytics = {
  productId: number;
  productName: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
  margin_avg: number;
};

type ProductSummary = {
  totalRevenue: number;
  totalProfit: number;
  totalQuantity: number;
};

function SummaryCard({
  title,
  value,
  highlight,
}: {
  title: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <p className="text-sm text-gray-500">{title}</p>
      <h3
        className={`text-3xl font-semibold mt-3 ${
          highlight ? "text-indigo-600" : "text-gray-900"
        }`}
      >
        {value}
      </h3>
    </div>
  );
}

export default function ProductAnalyticsPage() {
  const [data, setData] = useState<ProductAnalytics[]>([]);
  const [summary, setSummary] = useState<ProductSummary | null>(null);
  const [previousSummary, setPreviousSummary] = useState<ProductSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { start, end, range } = useDateRange();

  // Pagination for breakdown table
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.ceil(data.length / pageSize);

  function getPreviousRange(start?: Date, end?: Date) {
  if (!start || !end) return { prevStart: undefined, prevEnd: undefined };

  const diff = end.getTime() - start.getTime();

  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - diff);
    
  return { prevStart, prevEnd };
}

  useEffect(() => {
    if (!end) return;

    async function fetchData() {
      setLoading(true);
      try {
        // Current period
        const currentUrl = new URL("/api/analytics/products", window.location.origin);
        if (start) currentUrl.searchParams.set("from", start.toISOString());
        if (end) currentUrl.searchParams.set("to", end.toISOString());

        // Previous period
        const { prevStart, prevEnd } = getPreviousRange(start, end);

        const previousUrl = new URL("/api/analytics/products", window.location.origin);
        if (prevStart) previousUrl.searchParams.set("from", prevStart.toISOString());
        if (prevEnd) previousUrl.searchParams.set("to", prevEnd.toISOString());

        const [currentRes, previousRes] = await Promise.all([
          fetch(currentUrl.toString()),
          fetch(previousUrl.toString()),
        ]);

        const currentJson = await currentRes.json();
        const previousJson = await previousRes.json();

        setData(currentJson.products || []);
        setSummary(currentJson.summary || null);
        setPreviousSummary(previousJson.summary || null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to fetch analytics";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    setPage(1); // Reset to first page on filter/date change
  }, [start, end]);

  if (loading || !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-indigo-50 via-white to-blue-100">
        <div className="bg-white rounded-2xl shadow-lg p-10 border border-gray-100 text-lg text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  const margin =
    summary.totalRevenue > 0
      ? ((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1)
      : "0";

      let revenueGrowth = 0;

    if (summary && previousSummary && previousSummary.totalRevenue > 0) {
    revenueGrowth =
        ((summary.totalRevenue - previousSummary.totalRevenue) /
        previousSummary.totalRevenue) *
        100;
    }

  return (
    <div className="min-h-screen bg-linear-to-br  py-10 px-2 md:px-8">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold text-indigo-700">Product Analytics</h1>
          <p className="text-sm text-gray-500 mt-2">Revenue & profitability breakdown per product</p>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">

        {/* Revenue with Growth */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Revenue</p>
            <h3 className="text-3xl font-semibold mt-3 text-indigo-600">
            Rp {summary.totalRevenue.toLocaleString("id-ID")}
            </h3>

            {previousSummary && range !== "all" && (
            <p
                className={`text-sm mt-2 font-medium ${
                revenueGrowth >= 0 ? "text-green-600" : "text-red-600"
                }`}
            >
                {revenueGrowth >= 0 ? "▲" : "▼"}{" "}
                {Math.abs(revenueGrowth).toFixed(1)}% from previous period
            </p>
            )}
        </div>

        <SummaryCard
            title="Profit"
            value={`Rp ${summary.totalProfit.toLocaleString("id-ID")}`}
        />
        <SummaryCard
            title="Quantity Sold"
            value={summary.totalQuantity}
        />
        <SummaryCard
            title="Margin"
            value={`${margin}%`}
        />

        </div>

        {/* CHART */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <h2 className="text-lg font-semibold mb-6 text-indigo-700">Revenue by Product</h2>

          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data}>
              <XAxis dataKey="productName" />
              <YAxis
                tickFormatter={(value) =>
                  `Rp ${value / 1000}k`
                }
              />
              <Tooltip
                formatter={(value: unknown) =>
                  `Rp ${Number(value).toLocaleString("id-ID")}`
                }
              />
              <Bar
                dataKey="revenue"
                radius={[8, 8, 0, 0]}
                fill="#6366F1"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* TABLE BREAKDOWN with Pagination */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-x-auto">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-indigo-700">Detailed Breakdown</h2>
          </div>
          <div className="w-full min-w-175">
            <table className="w-full text-sm">
              <thead className="bg-indigo-50 text-indigo-700">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Product</th>
                  <th className="text-right px-6 py-3 font-semibold">Qty</th>
                  <th className="text-right px-6 py-3 font-semibold">Revenue</th>
                  <th className="text-right px-6 py-3 font-semibold">Cost</th>
                  <th className="text-right px-6 py-3 font-semibold">Profit</th>
                  <th className="text-right px-6 py-3 font-semibold">Margin</th>
                  <th className="text-right px-6 py-3 font-semibold">Avg Margin</th>
                  <th className="text-right px-6 py-3 font-semibold">Contribution</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400">
                      No data available
                    </td>
                  </tr>
                ) : (
                  data
                    .slice((page - 1) * pageSize, page * pageSize)
                    .map((p, idx) => {
                      const contribution =
                        summary.totalRevenue > 0
                          ? (p.revenue / summary.totalRevenue) * 100
                          : 0;
                      return (
                        <tr
                          key={p.productId}
                          className={`border-b border-gray-100 transition-all duration-150 ${idx % 2 === 0 ? "bg-white" : "bg-indigo-50"} hover:bg-indigo-100`}
                          style={{ opacity: 0, animation: `fadeInUp 0.4s ease ${idx * 0.04}s forwards` }}
                        >
                          {/* Product */}
                          <td className="px-6 py-4 font-semibold text-indigo-700">
                            <span className="inline-block bg-indigo-100 text-indigo-700 rounded-lg px-3 py-1 text-xs font-medium shadow-sm">
                              {p.productName}
                            </span>
                          </td>
                          {/* Qty */}
                          <td className="px-6 py-4 text-right text-gray-700 font-medium">
                            {p.quantitySold}
                          </td>
                          {/* Revenue */}
                          <td className="px-6 py-4 text-right text-gray-700">
                            <span className="font-semibold">
                              Rp {p.revenue.toLocaleString("id-ID")}
                            </span>
                          </td>
                          {/* Cost */}
                          <td className="px-6 py-4 text-right text-gray-700">
                            Rp {p.cost.toLocaleString("id-ID")}
                          </td>
                          {/* Profit */}
                          <td className="px-6 py-4 text-right">
                            <span className="text-green-600 font-bold">
                              Rp {p.profit.toLocaleString("id-ID")}
                            </span>
                          </td>
                          {/* Margin */}
                          <td className="px-6 py-4 text-right">
                            <span className="inline-block bg-green-50 text-green-700 rounded px-2 py-0.5 text-xs font-semibold">
                              {p.profitMargin.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {p.margin_avg != null ? (
                              <span className="inline-block bg-blue-50 text-blue-700 rounded px-2 py-0.5 text-xs font-semibold">
                                {p.margin_avg.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="inline-block bg-gray-100 text-gray-400 rounded px-2 py-0.5 text-xs font-semibold">
                                N/A
                              </span>
                            )}
                          </td>
                          {/* Contribution */}
                          <td className="px-6 py-4 text-right">
                            <span className="inline-block bg-yellow-50 text-yellow-700 rounded px-2 py-0.5 text-xs font-semibold">
                              {contribution.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <div className="text-sm text-gray-500">
                Page <span className="font-semibold text-indigo-700">{page}</span> of <span className="font-semibold text-indigo-700">{totalPages}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  className="w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-700 font-bold transition hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-gray-400">…</span>
                    ) : (
                      <button
                        key={item}
                        className={`w-8 h-8 rounded-full font-bold transition border ${item === page ? "bg-indigo-600 text-white shadow" : "bg-white text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 border-gray-300"}`}
                        onClick={() => setPage(item as number)}
                        disabled={item === page}
                      >
                        {item}
                      </button>
                    )
                  )}
                <button
                  className="w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-700 font-bold transition hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  ›
                </button>
              </div>
              <div>
                <select
                  className="px-2 py-1 rounded-xl border border-gray-300 text-sm bg-white transition focus:ring-2 focus:ring-indigo-400"
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {[10, 20, 50].map(size => (
                    <option key={size} value={size}>{size} per page</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}