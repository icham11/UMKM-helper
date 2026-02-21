"use client";

import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation"; // Removed unused import
import RevenueChart from "../components/charts/RevenueChart";
import { TrendingUp, AlertTriangle, Smile } from "lucide-react";

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

interface AlertItem {
  name: string;
  expirationDate?: string;
  currentStock?: number;
  minStock?: number;
}

interface InventoryBatch {
  expirationDate?: string;
}

interface Ingredient {
  name: string;
  currentStock: number;
  minStock: number;
  inventoryBatches?: InventoryBatch[];
}

export default function DashboardPage() {
  // const router = useRouter(); // Unused, remove

  const [todayRevenue, setTodayRevenue] = useState<number>(0);
  const [todayTransactions, setTodayTransactions] = useState<number>(0);
  const [monthProfit, setMonthProfit] = useState<number>(0);

  const [alerts, setAlerts] = useState({
    expired: [] as AlertItem[],
    expiring3: [] as AlertItem[],
    expiring7: [] as AlertItem[],
    lowStock: [] as AlertItem[],
  });

  const [aiInsight] = useState(
    "Your revenue is stable this month. Consider increasing volume to boost growth."
  );

  const [loading, setLoading] = useState(true);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [range, setRange] =
    useState<"today" | "7d" | "30d" | "all">("today");

  // Declare totalAlertCount only once here
  const totalAlertCount =
    alerts.expired.length +
    alerts.expiring3.length +
    alerts.expiring7.length +
    alerts.lowStock.length;
  // Animation for alert icon
  const alertPulse = totalAlertCount > 0 ? "animate-pulse" : "";

  function getDateRange(range: "today" | "7d" | "30d" | "all") {
    const now = new Date();
    const end = new Date(now);

    if (range === "all") return { start: undefined, end };

    const start = new Date(now);

    if (range === "today") start.setHours(0, 0, 0, 0);
    if (range === "7d") {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    }
    if (range === "30d") {
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
    }

    return { start, end };
  }

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);

        const { start, end } = getDateRange(range);

        const salesUrl = new URL("/api/sales", window.location.origin);
        if (start)
          salesUrl.searchParams.set("startDate", start.toISOString());
        if (end)
          salesUrl.searchParams.set("endDate", end.toISOString());

        const [salesRes, ingredientRes] = await Promise.all([
          fetch(salesUrl.toString()),
          fetch("/api/ingredients?withBatches=true"),
        ]);

        const salesData = await salesRes.json();
        const ingredientData = await ingredientRes.json();

        if (salesRes.ok && salesData.success) {
          setTodayRevenue(salesData.data.totalRevenue);
          setTodayTransactions(
            salesData.data.analytics.transactionCount
          );
          setMonthProfit(salesData.data.analytics.totalProfit);
        }

        if (ingredientRes.ok && ingredientData.success) {
          const today = new Date();
          const expired: AlertItem[] = [];
          const expiring3: AlertItem[] = [];
          const expiring7: AlertItem[] = [];
          const lowStock: AlertItem[] = [];

          ingredientData.data.forEach((ingredient: Ingredient) => {
            if (ingredient.currentStock < ingredient.minStock) {
              lowStock.push({
                name: ingredient.name,
                currentStock: ingredient.currentStock,
                minStock: ingredient.minStock,
              });
            }

            ingredient.inventoryBatches?.forEach(
              (batch: InventoryBatch) => {
                if (!batch.expirationDate) return;

                const expDate = new Date(batch.expirationDate);
                const diffDays =
                  (expDate.getTime() - today.getTime()) /
                  (1000 * 60 * 60 * 24);

                if (diffDays < 0)
                  expired.push({
                    name: ingredient.name,
                    expirationDate: batch.expirationDate,
                  });
                else if (diffDays <= 3)
                  expiring3.push({
                    name: ingredient.name,
                    expirationDate: batch.expirationDate,
                  });
                else if (diffDays <= 7)
                  expiring7.push({
                    name: ingredient.name,
                    expirationDate: batch.expirationDate,
                  });
              }
            );
          });

          setAlerts({ expired, expiring3, expiring7, lowStock });
        }
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [range]);

  //

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading dashboard...
      </div>
    );

  return (
    <>
      <div className="min-h-screen p-8 space-y-10 bg-linear-to-br from-indigo-50 via-slate-100 to-indigo-100">
        {/* Header */}
        <div className="bg-linear-to-r from-indigo-500 via-violet-500 to-indigo-400 rounded-3xl p-8 shadow-xl">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Smile className="text-yellow-300" size={30} />
            Good {getGreeting()}, Polo
          </h1>
          <p className="text-white/80 mt-2 text-sm">
            Here’s your business performance overview.
          </p>
        </div>

        {/* Filter */}
        <div className="flex gap-3">
          {["today", "7d", "30d", "all"].map((r) => (
            <button
              key={r}
              onClick={() =>
                setRange(r as "today" | "7d" | "30d" | "all")
              }
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                range === r
                  ? "bg-slate-900 text-white shadow"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <GlassCard
            title="Revenue"
            value={formatCurrency(todayRevenue)}
          />
          <GlassCard
            title="Transactions"
            value={todayTransactions}
          />
          <GlassCard
            title="Profit"
            value={formatCurrency(monthProfit)}
          />
          <GlassCard
            title="Avg Margin"
            value={
              todayRevenue > 0
                ? `${(
                    (monthProfit / todayRevenue) *
                    100
                  ).toFixed(1)}%`
                : "0%"
            }
          />
        </div>

        {/* Inventory Alerts Card */}
        <div
          className="relative group bg-linear-to-r from-amber-100 via-amber-50 to-white border border-amber-200 rounded-2xl p-6 shadow-lg cursor-pointer hover:shadow-amber-300/40 transition flex items-center justify-between"
          onClick={() => setIsAlertOpen(true)}
        >
          <div className="flex items-center gap-4">
            <span className={`rounded-full bg-amber-200 p-3 shadow-md ${alertPulse}`}>
              <AlertTriangle className="text-amber-600" size={28} />
            </span>
            <div>
              <p className="font-semibold text-amber-700 text-lg flex items-center gap-2">
                Inventory Alerts
                {totalAlertCount > 0 && (
                  <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full animate-bounce">
                    {totalAlertCount}
                  </span>
                )}
              </p>
              <p className="text-sm text-amber-600 mt-1">
                {totalAlertCount > 0 ? `${totalAlertCount} items need attention` : "All inventory is healthy!"}
              </p>
            </div>
          </div>
          <div className="absolute right-6 top-6">
            {totalAlertCount > 0 && <span className="animate-ping inline-block w-3 h-3 bg-amber-400 rounded-full" />}
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-500" />
            Revenue Trend
          </h2>
          <RevenueChart />
        </div>

        {/* AI Insight */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            🤖 AI Insight
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            {aiInsight}
          </p>
        </div>
      </div>

      {isAlertOpen && (
        <PremiumModal
          alerts={alerts}
          onClose={() => setIsAlertOpen(false)}
        />
      )}
    </>
  );
}

/* Extra Components */

function GlassCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="text-2xl font-bold text-slate-900 mt-2">
        {value}
      </h2>
    </div>
  );
}

function PremiumModal({
  alerts,
  onClose,
}: {
  alerts: {
    expired: AlertItem[];
    expiring3: AlertItem[];
    expiring7: AlertItem[];
    lowStock: AlertItem[];
  };
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-xl"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-6 text-amber-700 flex items-center gap-2">
          <AlertTriangle className="text-amber-500" size={24} /> Inventory Alerts
        </h2>
        <div className="space-y-4">
          {/* Low Stock */}
          {alerts.lowStock.length > 0 && (
            <div>
              <p className="font-semibold text-red-600 mb-2">Low Stock</p>
              <ul className="space-y-1">
                {alerts.lowStock.map((a, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1" />
                    <span className="font-medium">{a.name}</span>
                    <span className="text-xs text-slate-500">({a.currentStock}/{a.minStock})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Expired */}
          {alerts.expired.length > 0 && (
            <div>
              <p className="font-semibold text-amber-700 mb-2">Expired</p>
              <ul className="space-y-1">
                {alerts.expired.map((a, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="inline-block w-2 h-2 bg-amber-700 rounded-full mr-1" />
                    <span className="font-medium">{a.name}</span>
                    <span className="text-xs text-slate-500">({a.expirationDate})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Expiring in 3 days */}
          {alerts.expiring3.length > 0 && (
            <div>
              <p className="font-semibold text-orange-500 mb-2">Expiring Soon (≤3 days)</p>
              <ul className="space-y-1">
                {alerts.expiring3.map((a, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="inline-block w-2 h-2 bg-orange-400 rounded-full mr-1" />
                    <span className="font-medium">{a.name}</span>
                    <span className="text-xs text-slate-500">({a.expirationDate})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Expiring in 7 days */}
          {alerts.expiring7.length > 0 && (
            <div>
              <p className="font-semibold text-yellow-500 mb-2">Expiring Soon (≤7 days)</p>
              <ul className="space-y-1">
                {alerts.expiring7.map((a, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full mr-1" />
                    <span className="font-medium">{a.name}</span>
                    <span className="text-xs text-slate-500">({a.expirationDate})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* No Alerts */}
          {alerts.lowStock.length === 0 && alerts.expired.length === 0 && alerts.expiring3.length === 0 && alerts.expiring7.length === 0 && (
            <div className="text-green-600 text-center font-semibold text-lg">
              🎉 All inventory is healthy!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}