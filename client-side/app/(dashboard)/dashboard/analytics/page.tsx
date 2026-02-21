"use client";

import { useEffect, useState, useCallback } from "react";
import {
  TrendingUp,
  DollarSign,
  HeartPulse,
  BarChart3,
  Sparkles,
  ShoppingCart,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ─── Types ───
interface TopProduct {
  product: { id: number; name: string } | null;
  quantitySold: number;
}
interface LowStockItem {
  id: number;
  name: string;
  currentStock: number;
  minStock: number;
}
interface DashboardData {
  totalRevenue: number;
  totalProfit: number;
  avgMargin: number;
  transactionCount: number;
  topProducts: TopProduct[];
  lowStockIngredients: LowStockItem[];
}
interface GrowthData {
  revenueGrowth: number;
  profitGrowth: number;
}
interface HealthData {
  overallScore: number;
  classification: string;
  revenueScore?: number;
  profitScore?: number;
  wasteScore?: number;
  stabilityScore?: number;
}
interface AIInsight {
  category: string;
  severity: string;
  title: string;
  description: string;
  metric: string;
}
interface InsightData {
  summary: string;
  insights: AIInsight[] | string[];
  isAI: boolean;
}
interface MonthlyDataPoint {
  date: string;
  revenue: number;
  profit: number;
}

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

const formatRupiah = (val: number) =>
  `Rp ${val.toLocaleString("id-ID")}`;

const formatShortRupiah = (val: number) => {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}jt`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}rb`;
  return val.toString();
};

export default function AnalyticsPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [growth, setGrowth] = useState<GrowthData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [insight, setInsight] = useState<InsightData | null>(null);
  const [monthly, setMonthly] = useState<MonthlyDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);

      const params = `?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;

      const [dRes, gRes, hRes, iRes, mRes] = await Promise.allSettled([
        fetch(`/api/analytics/dashboard${params}`).then((r) => r.json()),
        fetch("/api/analytics/growth").then((r) => r.json()),
        fetch("/api/analytics/health").then((r) => r.json()),
        fetch("/api/analytics/insight").then((r) => r.json()),
        fetch(`/api/analytics/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`).then((r) => r.json()),
      ]);

      if (dRes.status === "fulfilled") setDashboard(dRes.value.data);
      if (gRes.status === "fulfilled") setGrowth(gRes.value.data);
      if (hRes.status === "fulfilled") setHealth(hRes.value.data);
      if (iRes.status === "fulfilled") setInsight(iRes.value.data);
      if (mRes.status === "fulfilled") setMonthly(mRes.value.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Memuat analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-red-50 p-8 rounded-2xl border border-red-200">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={fetchData} className="mt-3 text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const healthScore = health?.overallScore ?? 0;
  const healthClass = health?.classification ?? "N/A";
  const healthColor =
    healthScore >= 80 ? "text-green-600" : healthScore >= 60 ? "text-yellow-600" : "text-red-600";
  const healthBg =
    healthScore >= 80 ? "bg-green-100 text-green-700" : healthScore >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
  const healthStroke =
    healthScore >= 80 ? "#22c55e" : healthScore >= 60 ? "#eab308" : "#ef4444";

  const avgTransaction =
    dashboard && dashboard.transactionCount > 0
      ? dashboard.totalRevenue / dashboard.transactionCount
      : 0;

  // Pie data for top products
  const pieData = (dashboard?.topProducts || [])
    .filter((p) => p.product)
    .map((p) => ({
      name: p.product!.name,
      value: p.quantitySold,
    }));

  // Monthly chart data
  const chartData = monthly.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
  }));

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            Business Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-1">Ringkasan performa bisnis 30 hari terakhir</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 text-sm bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition text-gray-600"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ═══ KPI Cards ═══ */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
      >
        <KpiCard
          title="Revenue (30 hari)"
          value={formatRupiah(dashboard?.totalRevenue ?? 0)}
          icon={<DollarSign className="w-5 h-5" />}
          color="bg-indigo-600"
          subtext={growth ? `${growth.revenueGrowth >= 0 ? "+" : ""}${growth.revenueGrowth}% vs periode sebelumnya` : undefined}
          trend={growth?.revenueGrowth}
        />
        <KpiCard
          title="Profit (30 hari)"
          value={formatRupiah(dashboard?.totalProfit ?? 0)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="bg-emerald-600"
          subtext={`Margin ${dashboard?.avgMargin ?? 0}%`}
          trend={growth?.profitGrowth}
        />
        <KpiCard
          title="Total Transaksi"
          value={`${dashboard?.transactionCount ?? 0}`}
          icon={<ShoppingCart className="w-5 h-5" />}
          color="bg-purple-600"
          subtext={avgTransaction > 0 ? `Rata-rata ${formatRupiah(Math.round(avgTransaction))}` : undefined}
        />
        <KpiCard
          title="Business Health"
          value={`${healthScore}/100`}
          icon={<HeartPulse className="w-5 h-5" />}
          color={healthScore >= 80 ? "bg-green-600" : healthScore >= 60 ? "bg-yellow-500" : "bg-red-500"}
          subtext={healthClass}
        />
      </motion.div>

      {/* ═══ Row 2: Revenue Chart + Health Score ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue/Profit Chart */}
        <motion.div
          className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-sm font-semibold text-gray-800 mb-4">📈 Revenue &amp; Profit Bulanan</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={formatShortRupiah} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [formatRupiah(Number(value ?? 0)), name === "revenue" ? "Revenue" : "Profit"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#gradRevenue)" />
                <Area type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} fill="url(#gradProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-65 text-gray-400 text-sm">
              Belum ada data bulan ini
            </div>
          )}
        </motion.div>

        {/* Health Score Ring */}
        <motion.div
          className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col items-center justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-sm font-semibold text-gray-800 mb-4">💓 Health Score</h3>
          <div className="relative w-32 h-32 mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={healthStroke}
                strokeWidth="8"
                strokeDasharray={263.89}
                strokeDashoffset={263.89 - (healthScore / 100) * 263.89}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${healthColor}`}>{healthScore}</span>
              <span className="text-[10px] text-gray-400">/ 100</span>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${healthBg}`}>
            {healthClass}
          </span>
          <div className="mt-3 text-center">
            <p className="text-[11px] text-gray-400">
              {healthScore >= 80
                ? "Bisnis dalam kondisi sangat baik!"
                : healthScore >= 60
                ? "Ada beberapa area yang perlu perhatian"
                : "Perlu tindakan segera untuk perbaikan"}
            </p>
          </div>

          {/* Sub-score breakdown */}
          {health && (
            <div className="w-full mt-4 space-y-2">
              {[
                { label: "Revenue", value: health.revenueScore ?? 0, max: 25, color: "#6366f1" },
                { label: "Profit", value: health.profitScore ?? 0, max: 25, color: "#22c55e" },
                { label: "Efisiensi", value: health.wasteScore ?? 0, max: 25, color: "#f59e0b" },
                { label: "Stabilitas", value: health.stabilityScore ?? 0, max: 25, color: "#8b5cf6" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-16 text-right">{s.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-700"
                      style={{ width: `${(s.value / s.max) * 100}%`, backgroundColor: s.color }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 w-8">{s.value}/{s.max}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ═══ Row 3: Top Products + Low Stock ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <motion.div
          className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            🏆 Top 5 Produk Terlaris
          </h3>
          {(dashboard?.topProducts?.length ?? 0) > 0 ? (
            <div className="flex gap-6">
              {/* Pie chart */}
              <div className="w-32 h-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={50}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Tooltip formatter={(val: any) => `${Number(val ?? 0)} pcs`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* List */}
              <div className="flex-1 space-y-2">
                {dashboard?.topProducts.map((item, i) => {
                  const maxQty = dashboard.topProducts[0]?.quantitySold || 1;
                  const pct = Math.round((item.quantitySold / maxQty) * 100);
                  return (
                    <div key={item.product?.id ?? i} className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700 truncate">
                            {item.product?.name ?? "—"}
                          </span>
                          <span className="text-xs text-gray-500 ml-2 shrink-0">{item.quantitySold} pcs</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                          <div
                            className="h-1.5 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 text-sm py-8">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Belum ada data penjualan
            </div>
          )}
        </motion.div>

        {/* Low Stock Alert */}
        <motion.div
          className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Peringatan Stok Rendah
          </h3>
          {(dashboard?.lowStockIngredients?.length ?? 0) > 0 ? (
            <div className="space-y-2 max-h-50 overflow-y-auto">
              {dashboard?.lowStockIngredients.map((item) => {
                const pct = item.minStock > 0 ? Math.min((item.currentStock / item.minStock) * 100, 100) : 0;
                const isOut = item.currentStock <= 0;
                return (
                  <div key={item.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${isOut ? "bg-red-50 border border-red-200" : "bg-orange-50 border border-orange-200"}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isOut ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}>
                      {isOut ? "!" : `${Math.round(pct)}%`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-400">
                        Stok: {item.currentStock} / Min: {item.minStock}
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isOut ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}>
                      {isOut ? "Habis" : "Rendah"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-400 text-sm py-8">
              <span className="text-2xl block mb-2">✅</span>
              Semua stok dalam kondisi aman
            </div>
          )}
        </motion.div>
      </div>

      {/* ═══ Row 4: Profit Bar Chart ═══ */}
      {chartData.length > 0 && (
        <motion.div
          className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-sm font-semibold text-gray-800 mb-4">📊 Profit Harian Bulan Ini</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(chartData.length / 10))} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={formatShortRupiah} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [formatRupiah(Number(value ?? 0)), "Profit"]}
              />
              <Bar dataKey="profit" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={24}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.profit >= 0 ? "#22c55e" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* ═══ Row 5: Executive Summary + AI Insights ═══ */}
      {insight && (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          {/* Executive Summary */}
          {insight.summary && (
            <div className="bg-linear-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-indigo-200" />
                <h3 className="text-sm font-bold text-indigo-100">Ringkasan Eksekutif</h3>
                {insight.isAI && (
                  <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full ml-auto">🤖 AI-Generated</span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-white/90">{insight.summary}</p>
            </div>
          )}

          {/* Insight Cards */}
          {insight.insights && insight.insights.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                AI Insights & Rekomendasi
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {insight.insights.map((item, i) => {
                  // Support both old string[] and new AIInsight[] format
                  if (typeof item === "string") {
                    return (
                      <InsightCard
                        key={i}
                        index={i}
                        title="Insight"
                        description={item}
                        severity="info"
                        category="general"
                        metric=""
                      />
                    );
                  }
                  const ins = item as AIInsight;
                  return (
                    <InsightCard
                      key={i}
                      index={i}
                      title={ins.title}
                      description={ins.description}
                      severity={ins.severity}
                      category={ins.category}
                      metric={ins.metric}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── KPI Card Component ───
function KpiCard({
  title,
  value,
  icon,
  color,
  subtext,
  trend,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtext?: string;
  trend?: number;
}) {
  return (
    <motion.div
      className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition"
      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`${color} text-white p-2 rounded-xl`}>{icon}</div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-1">{title}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      {subtext && <p className="text-[10px] text-gray-400 mt-1">{subtext}</p>}
    </motion.div>
  );
}

// ─── Insight Card Component ───
const SEVERITY_STYLES: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  success: { bg: "bg-green-50", border: "border-green-200", icon: "✅", badge: "bg-green-100 text-green-700" },
  warning: { bg: "bg-amber-50", border: "border-amber-200", icon: "⚠️", badge: "bg-amber-100 text-amber-700" },
  danger: { bg: "bg-red-50", border: "border-red-200", icon: "🔴", badge: "bg-red-100 text-red-700" },
  info: { bg: "bg-blue-50", border: "border-blue-200", icon: "💡", badge: "bg-blue-100 text-blue-700" },
};

const CATEGORY_LABELS: Record<string, { emoji: string; label: string }> = {
  revenue: { emoji: "💰", label: "Revenue" },
  profit: { emoji: "📈", label: "Profit" },
  inventory: { emoji: "📦", label: "Inventori" },
  product: { emoji: "🏷️", label: "Produk" },
  growth: { emoji: "🚀", label: "Growth" },
  general: { emoji: "📋", label: "Umum" },
};

function InsightCard({
  index,
  title,
  description,
  severity,
  category,
  metric,
}: {
  index: number;
  title: string;
  description: string;
  severity: string;
  category: string;
  metric: string;
}) {
  const style = SEVERITY_STYLES[severity] || SEVERITY_STYLES.info;
  const cat = CATEGORY_LABELS[category] || CATEGORY_LABELS.general;

  return (
    <motion.div
      className={`${style.bg} ${style.border} border rounded-xl p-4 hover:shadow-md transition`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 + index * 0.08 }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{style.icon}</span>
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${style.badge}`}>
            {cat.emoji} {cat.label}
          </span>
        </div>
        {metric && (
          <span className="text-xs font-bold text-gray-800 bg-white px-2 py-0.5 rounded-lg shadow-sm shrink-0">
            {metric}
          </span>
        )}
      </div>
      <h4 className="text-sm font-semibold text-gray-800 mb-1">{title}</h4>
      <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
    </motion.div>
  );
}

