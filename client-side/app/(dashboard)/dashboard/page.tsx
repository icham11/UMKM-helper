"use client";

import { useEffect, useState } from "react";
import StatCard from "../components/StatCard";
import RevenueChart from "../components/charts/RevenueChart";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

export default function DashboardPage() {
  const [todayRevenue, setTodayRevenue] = useState<number | null>(null);
  const [todayTransactions, setTodayTransactions] = useState<number | null>(null);
  const [monthRevenue, setMonthRevenue] = useState<number | null>(null);
  const [monthProfit, setMonthProfit] = useState<number | null>(null);
  const [aiInsight, setAiInsight] = useState<string>("Memuat insight...");

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const now = new Date();
        const startToday = new Date(now);
        startToday.setHours(0, 0, 0, 0);
        const endToday = new Date(now);
        endToday.setHours(23, 59, 59, 999);

        const startMonth = new Date(now);
        startMonth.setDate(now.getDate() - 29);
        startMonth.setHours(0, 0, 0, 0);

        const fetchSales = async (startDate: Date, endDate: Date) => {
          const url = new URL("/api/sales", window.location.origin);
          url.searchParams.set("startDate", startDate.toISOString());
          url.searchParams.set("endDate", endDate.toISOString());

          const response = await fetch(url.toString());
          const data = await response.json();
          if (!response.ok || !data?.success) {
            throw new Error(data?.error || "Failed to fetch sales");
          }
          return data.data as {
            sales: unknown[];
            analytics: { transactionCount: number; totalProfit: number };
            totalRevenue: number;
          };
        };

        const [todayData, monthData] = await Promise.all([
          fetchSales(startToday, endToday),
          fetchSales(startMonth, endToday),
        ]);

        setTodayRevenue(todayData.totalRevenue);
        setTodayTransactions(todayData.analytics.transactionCount);
        setMonthRevenue(monthData.totalRevenue);
        setMonthProfit(monthData.analytics.totalProfit);

        const analyticsResponse = await fetch("/api/business-analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "sales",
            data: {
              range: {
                start: startMonth.toISOString(),
                end: endToday.toISOString(),
              },
              sales: monthData.sales,
              analytics: monthData.analytics,
            },
          }),
        });

        const analyticsData = await analyticsResponse.json();
        if (analyticsResponse.ok && analyticsData?.success) {
          setAiInsight(analyticsData.analysis || "Insight tidak tersedia.");
        } else {
          setAiInsight("Insight tidak tersedia.");
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        setAiInsight("Insight tidak tersedia.");
      }
    };

    loadDashboardData();
  }, []);

  const todayRevenueLabel =
    todayRevenue === null ? "—" : formatCurrency(todayRevenue);
  const todayTransactionsLabel =
    todayTransactions === null ? "—" : todayTransactions.toLocaleString("id-ID");
  const monthRevenueLabel =
    monthRevenue === null ? "—" : formatCurrency(monthRevenue);
  const monthProfitLabel =
    monthProfit === null ? "—" : formatCurrency(monthProfit);

  return (
    <div className="space-y-8">
      {/* Blue header section */}
      <div className="w-full px-6 pt-8 pb-14 flex flex-col gap-6 relative overflow-visible">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-blue-800 text-base font-semibold mb-1">/ Pages / Default</div>
            <div className="text-2xl font-bold text-blue-900 drop-shadow">Default</div>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Type here..."
              className="px-4 py-2 rounded-lg border-none outline-none bg-white text-gray-700 shadow"
            />
            <span className="text-blue-800 font-medium">Sign In</span>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4 mt-2">
          <StatCard
            title="REVENUE HARI INI"
            value={todayRevenueLabel}
            icon={<span className="text-indigo-600 text-xl">💰</span>}
            tooltip="Total pendapatan hari ini dari /api/sales"
          />
          <StatCard
            title="TRANSAKSI HARI INI"
            value={todayTransactionsLabel}
            icon={<span className="text-indigo-600 text-xl">🧾</span>}
            tooltip="Jumlah transaksi hari ini"
          />
          <StatCard
            title="REVENUE 30 HARI"
            value={monthRevenueLabel}
            icon={<span className="text-red-600 text-xl">📈</span>}
            tooltip="Total pendapatan 30 hari terakhir"
          />
          <StatCard
            title="PROFIT 30 HARI"
            value={monthProfitLabel}
            icon={<span className="text-orange-600 text-xl">💹</span>}
            tooltip="Total profit 30 hari terakhir"
          />
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="px-6 mb-6">
        <RevenueChart />
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-semibold mb-4">Top Selling Menu</h2>
          <div className="h-48 flex items-center justify-center text-gray-400">
            Bar Chart Placeholder
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-semibold mb-4">AI Insight</h2>
          <p className="text-sm text-gray-600">{aiInsight}</p>
        </div>
      </div>
    </div>
  );
}
