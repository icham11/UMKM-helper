"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RevenueChart from "../components/charts/RevenueChart";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

interface LowStockItem {
  id: number;
  name: string;
  currentStock: number;
  minStock: number;
}

export default function DashboardPage() {
  const router = useRouter();

  const [todayRevenue, setTodayRevenue] = useState<number | null>(null);
  const [todayTransactions, setTodayTransactions] = useState<number | null>(null);
  const [monthRevenue, setMonthRevenue] = useState<number | null>(null);
  const [monthProfit, setMonthProfit] = useState<number | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [aiInsight, setAiInsight] = useState<string>(
    "Your revenue is stable this month. Consider increasing volume to boost growth."
  );
  const [loading, setLoading] = useState(true);

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

          const res = await fetch(url.toString());
          const data = await res.json();

          if (!res.ok || !data.success) {
            throw new Error("Failed to fetch sales");
          }

          return data.data;
        };

        const [todayData, monthData, ingredientRes] = await Promise.all([
          fetchSales(startToday, endToday),
          fetchSales(startMonth, endToday),
          fetch("/api/ingredients"),
        ]);

        const ingredientData = await ingredientRes.json();

        setTodayRevenue(todayData.totalRevenue);
        setTodayTransactions(todayData.analytics.transactionCount);
        setMonthRevenue(monthData.totalRevenue);
        setMonthProfit(monthData.analytics.totalProfit);

        if (ingredientRes.ok && ingredientData.success) {
          const lowStockItems: LowStockItem[] = ingredientData.data.filter(
            (item: LowStockItem) => item.currentStock < item.minStock
          );
          setLowStock(lowStockItems);
        }
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 space-y-10">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-slate-800">
            Good {getGreeting()}, Polo 👋
          </h1>
          <p className="text-slate-500 mt-1">
            Here&apos;s your business performance overview.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KpiCard
          title="Today Revenue"
          value={todayRevenue !== null ? formatCurrency(todayRevenue) : "—"}
        />
        <KpiCard
          title="Today Transactions"
          value={todayTransactions !== null ? todayTransactions : "—"}
        />
        <KpiCard
          title="Revenue (30 Days)"
          value={monthRevenue !== null ? formatCurrency(monthRevenue) : "—"}
        />
        <KpiCard
          title="Profit (30 Days)"
          value={monthProfit !== null ? formatCurrency(monthProfit) : "—"}
        />
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="border border-amber-200 rounded-xl p-6 bg-amber-50/40">
          <h3 className="text-amber-700 font-semibold mb-2">
            ⚠ Low Stock Alert
          </h3>
          <ul className="text-sm text-amber-600 space-y-1">
            {lowStock.map((item) => (
              <li key={item.id}>
                {item.name} ({item.currentStock}/{item.minStock})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Revenue Chart */}
      <div className="bg-white/80 backdrop-blur border border-slate-200 shadow-sm rounded-3xl p-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Revenue Trend
        </h2>
        <RevenueChart />
      </div>

      {/* Bottom Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white/80 backdrop-blur border border-slate-200 shadow-sm rounded-3xl p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <ActionButton
              label="New Sale"
              onClick={() => router.push("/dashboard/pos")}
            />
            <ActionButton
              label="Add Ingredient"
              onClick={() => router.push("/dashboard/ingredients")}
            />
            <ActionButton
              label="View Analytics"
              onClick={() => router.push("/dashboard/analytics")}
            />
            <ActionButton
              label="Manage Recipes"
              onClick={() => router.push("/dashboard/recipes")}
            />
          </div>
        </div>

        {/* AI Insight — Gabungan styling Ornest + fitur Release-1 */}
        <div className="bg-white/80 backdrop-blur border border-slate-200 shadow-sm rounded-3xl p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              🤖 AI Insight
            </h2>
            <a
              href="/dashboard/ai-analysis"
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              Buka AI Center →
            </a>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            {aiInsight}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="/dashboard/ai-analysis"
              className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition"
            >
              <span>💬</span> AI Chat
            </a>
            <a
              href="/dashboard/ai-analysis"
              className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg text-xs font-medium text-purple-700 hover:bg-purple-100 transition"
            >
              <span>🧠</span> Smart Insights
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white/80 backdrop-blur border border-slate-200 shadow-sm rounded-2xl p-6 transition hover:shadow-md hover:-translate-y-1 duration-300">
      <p className="text-slate-500 text-sm">{title}</p>
      <h2 className="text-2xl font-semibold text-slate-900 mt-2 tracking-tight">
        {value}
      </h2>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-slate-900 text-white py-3 rounded-xl hover:bg-slate-800 transition text-sm font-medium shadow-sm hover:shadow-md"
    >
      {label}
    </button>
  );
}