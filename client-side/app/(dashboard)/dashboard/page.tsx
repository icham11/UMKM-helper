"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RevenueChart from "../components/charts/RevenueChart";
import {
  TrendingUp,
  ShoppingCart,
  Wallet,
  AlertTriangle,
  Zap,
  Smile,
} from "lucide-react";

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

export default function DashboardPage() {
  const router = useRouter();

  const [todayRevenue, setTodayRevenue] = useState<number | null>(null);
  const [todayTransactions, setTodayTransactions] = useState<number | null>(
    null
  );
  const [monthRevenue, setMonthRevenue] = useState<number | null>(null);
  const [monthProfit, setMonthProfit] = useState<number | null>(null);

  const [alerts, setAlerts] = useState({
    expired: [] as AlertItem[],
    expiring3: [] as AlertItem[],
    expiring7: [] as AlertItem[],
    lowStock: [] as AlertItem[],
  });

  const [aiInsight, setAiInsight] = useState<string>(
    "Your revenue is stable this month. Consider increasing volume to boost growth."
  );

  const [loading, setLoading] = useState(true);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [range, setRange] = useState<"today" | "7d" | "30d" | "all">("today");

  function getDateRange(range: "today" | "7d" | "30d" | "all") {
    const now = new Date();
    const end = new Date(now);

    if (range === "all") {
      return { start: undefined, end };
    }

    const start = new Date(now);

    if (range === "today") {
      start.setHours(0, 0, 0, 0);
    }

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

        if (start) {
          salesUrl.searchParams.set("startDate", start.toISOString());
        }

        if (end) {
          salesUrl.searchParams.set("endDate", end.toISOString());
        }

        const [salesRes, ingredientRes] = await Promise.all([
          fetch(salesUrl.toString()),
          fetch("/api/ingredients?withBatches=true"),
        ]);

        const salesData = await salesRes.json();
        const ingredientData = await ingredientRes.json();

        if (!salesRes.ok || !salesData.success) {
          throw new Error("Failed to fetch sales");
        }

        setTodayRevenue(salesData.data.totalRevenue);
        setTodayTransactions(salesData.data.analytics.transactionCount);
        setMonthRevenue(salesData.data.totalRevenue);
        setMonthProfit(salesData.data.analytics.totalProfit);

        // ===============================
        // ALERT LOGIC
        // ===============================

        if (ingredientRes.ok && ingredientData.success) {
          const today = new Date();

          const expired: AlertItem[] = [];
          const expiring3: AlertItem[] = [];
          const expiring7: AlertItem[] = [];
          const lowStock: AlertItem[] = [];

          type InventoryBatch = {
            expirationDate?: string;
          };

          type Ingredient = {
            name: string;
            currentStock: number;
            minStock: number;
            inventoryBatches?: InventoryBatch[];
          };

          (ingredientData.data as Ingredient[]).forEach((ingredient) => {
            if (ingredient.currentStock < ingredient.minStock) {
              lowStock.push({
                name: ingredient.name,
                currentStock: ingredient.currentStock,
                minStock: ingredient.minStock,
              });
            }

            ingredient.inventoryBatches?.forEach((batch: InventoryBatch) => {
              if (!batch.expirationDate) return;

              const expDate = new Date(batch.expirationDate);
              const diffDays =
                (expDate.getTime() - today.getTime()) /
                (1000 * 60 * 60 * 24);

              if (diffDays < 0) {
                expired.push({
                  name: ingredient.name,
                  expirationDate: batch.expirationDate,
                });
              } else if (diffDays <= 3) {
                expiring3.push({
                  name: ingredient.name,
                  expirationDate: batch.expirationDate,
                });
              } else if (diffDays <= 7) {
                expiring7.push({
                  name: ingredient.name,
                  expirationDate: batch.expirationDate,
                });
              }
            });
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

  const totalAlertCount =
    alerts.expired.length +
    alerts.expiring3.length +
    alerts.expiring7.length +
    alerts.lowStock.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8 space-y-8 md:space-y-10 bg-gradient-to-br animate-fadein">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400 rounded-2xl p-6 shadow-lg animate-slidein">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Smile
              className="inline-block text-yellow-300 animate-bounce"
              size={32}
            />
            Good {getGreeting()}, Polo
          </h1>
          <p className="text-indigo-100 mt-1">
            Here&apos;s your business performance overview.
          </p>
        </div>
        <div className="flex gap-2">
          <Zap className="text-yellow-300 animate-pulse" size={32} />
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { label: "Today", value: "today" },
          { label: "7D", value: "7d" },
          { label: "30D", value: "30d" },
          { label: "All Time", value: "all" },
        ].map((item) => (
          <button
            key={item.value}
            onClick={() =>
              setRange(item.value as "today" | "7d" | "30d" | "all")
            }
            className={`px-4 py-2 text-sm rounded-lg transition ${
              range === item.value
                ? "bg-white shadow text-slate-900"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-500 mt-2">
        Showing data for{" "}
        <span className="font-medium text-slate-700">
          {range === "today" && "Today"}
          {range === "7d" && "Last 7 Days"}
          {range === "30d" && "Last 30 Days"}
          {range === "all" && "All Time"}
        </span>
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <KpiCard
          title="Revenue"
          value={todayRevenue !== null ? formatCurrency(todayRevenue) : "—"}
        />

        <KpiCard
          title="Transactions"
          value={todayTransactions !== null ? todayTransactions : "—"}
        />

        <KpiCard
          title="Profit"
          value={monthProfit !== null ? formatCurrency(monthProfit) : "—"}
        />

        <KpiCard
          title="Avg Margin"
          value={
            todayRevenue && monthProfit
              ? `${((monthProfit / todayRevenue) * 100).toFixed(1)}%`
              : "—"
          }
        />
      </div>

      {/* Compact Inventory Alert Card */}
      {totalAlertCount > 0 && (
        <div
          onClick={() => setIsAlertOpen(true)}
          className="bg-gradient-to-r from-red-50 via-yellow-50 to-amber-50 border border-amber-200 rounded-2xl p-6 shadow-md cursor-pointer hover:shadow-lg transition flex items-center gap-4 animate-fadein"
        >
          <AlertTriangle className="text-amber-500 animate-pulse" size={32} />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-800 flex items-center gap-2">
              Inventory Alerts
              <span className="ml-2 text-xs bg-amber-600 text-white px-3 py-1 rounded-full animate-bounce">
                {totalAlertCount}
              </span>
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              {alerts.lowStock.length} Low Stock •{" "}
              {alerts.expired.length +
                alerts.expiring3.length +
                alerts.expiring7.length}{" "}
              Expiring
            </p>
          </div>
        </div>
      )}

      {/* Revenue Chart */}
      <div className="bg-white border border-slate-200 shadow-lg rounded-3xl p-4 md:p-8 animate-fadein">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="text-indigo-500" size={22} /> Revenue Trend
        </h2>
        <RevenueChart />
      </div>

      {/* AI Insight */}
      <div className="bg-white/80 backdrop-blur border border-slate-200 shadow-sm rounded-3xl p-8 animate-fadein">
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

      {/* ALERT MODAL */}
      {isAlertOpen && (
        <AlertModal alerts={alerts} onClose={() => setIsAlertOpen(false)} />
      )}
    </div>
  );
}

/* ---------- COMPONENTS ---------- */

function KpiCard({
  title,
  value,
  icon,
  animate,
}: {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  animate?: boolean;
}) {
  return (
    <div className="bg-gradient-to-br from-indigo-100 via-white to-violet-100 border border-indigo-100 shadow-lg rounded-2xl p-6 flex flex-col gap-2 items-start hover:scale-[1.03] transition-transform duration-200 animate-fadein">
      <div className="flex items-center gap-2">
        {icon && (
          <span className="bg-white rounded-full p-2 shadow-md mr-2">
            {icon}
          </span>
        )}
        <p className="text-slate-600 text-sm font-semibold">{title}</p>
      </div>
      <h2
        className={`text-2xl font-bold text-slate-900 mt-1 ${animate ? "animate-count" : ""}`}
      >
        {value}
      </h2>
    </div>
  );
}

function AlertModal({
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
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fadein"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-slidein"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={22} /> Inventory
            Alerts
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-transform hover:scale-125"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 text-sm max-h-[60vh] overflow-y-auto">
          {alerts.expired.length > 0 && (
            <AlertSection
              title="🔴 Expired"
              color="red"
              items={alerts.expired}
            />
          )}
          {alerts.expiring3.length > 0 && (
            <AlertSection
              title="🟠 Expiring ≤ 3 Days"
              color="orange"
              items={alerts.expiring3}
            />
          )}
          {alerts.expiring7.length > 0 && (
            <AlertSection
              title="🟡 Expiring ≤ 7 Days"
              color="yellow"
              items={alerts.expiring7}
            />
          )}
          {alerts.lowStock.length > 0 && (
            <AlertSection
              title="⚠ Low Stock"
              color="amber"
              items={alerts.lowStock}
              type="stock"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AlertSection({
  title,
  color,
  items,
  type,
}: {
  title: string;
  color: "red" | "orange" | "yellow" | "amber";
  items: AlertItem[];
  type?: "stock";
}) {
  const colorMap = {
    red: {
      title: "text-red-600",
      text: "text-red-500",
    },
    orange: {
      title: "text-orange-600",
      text: "text-orange-500",
    },
    yellow: {
      title: "text-yellow-600",
      text: "text-yellow-500",
    },
    amber: {
      title: "text-amber-600",
      text: "text-amber-500",
    },
  };

  return (
    <div>
      <p
        className={`font-medium ${colorMap[color].title} flex items-center gap-2`}
      >
        {title}{" "}
        <span className="ml-1 bg-white border border-gray-200 rounded-full px-2 py-0.5 text-xs font-bold">
          {items.length}
        </span>
      </p>
      <ul className={`mt-2 space-y-1 ${colorMap[color].text}`}>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 animate-fadein">
            {type === "stock" ? (
              <>
                <AlertTriangle className="text-amber-500" size={16} />
                <span>
                  {item.name}{" "}
                  <span className="text-xs text-slate-500">
                    ({item.currentStock}/{item.minStock})
                  </span>
                </span>
              </>
            ) : (
              <>
                <Zap className="text-yellow-500" size={16} />
                <span>
                  {item.name}{" "}
                  <span className="text-xs text-slate-500">
                    -
                    {item.expirationDate
                      ? new Date(item.expirationDate).toLocaleDateString(
                          "id-ID"
                        )
                      : "Unknown"}
                  </span>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Animations (Tailwind CSS custom)
// Add these to your global CSS if not present:
// .animate-fadein { animation: fadeIn 0.7s; }
// .animate-slidein { animation: slideIn 0.7s; }
// @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
// @keyframes slideIn { from { opacity: 0; transform: translateY(30px);} to { opacity: 1; transform: none; } }
// .animate-count { animation: countUp 1s; }
// @keyframes countUp { from { opacity: 0.5; transform: scale(0.95);} to { opacity: 1; transform: scale(1);} }