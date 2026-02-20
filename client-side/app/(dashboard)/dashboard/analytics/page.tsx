"use client";

import { useEffect, useState } from "react";
import { TrendingUp, DollarSign, HeartPulse, BarChart3, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

type DashboardData = {
  todayRevenue: number;
  todayProfit: number;
};

type GrowthData = {
  revenueGrowth: number;
  profitGrowth: number;
};

type HealthData = {
  overallScore: number;
  classification: string;
};

type InsightData = {
  insights: string[];
};

export default function AnalyticsPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [growth, setGrowth] = useState<GrowthData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [insight, setInsight] = useState<InsightData | null>(null);

  useEffect(() => {
    async function fetchData() {
      const d = await fetch("/api/analytics/dashboard").then((r) => r.json());
      const g = await fetch("/api/analytics/growth").then((r) => r.json());
      const h = await fetch("/api/analytics/health").then((r) => r.json());
      const i = await fetch("/api/analytics/insight").then((r) => r.json());

      setDashboard(d.data);
      setGrowth(g.data);
      setHealth(h.data);
      setInsight(i.data);
    }

    fetchData();
  }, []);

  if (!dashboard) {
    return <div className="p-10 text-gray-500">Loading analytics...</div>;
  }

  return (
    <div className="relative min-h-screen p-0">
      {/* Background Gradient */}
      
      <div className="relative z-10 p-8 space-y-10">
        <motion.h1
          className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 drop-shadow-xl flex items-center gap-3 animate-gradient"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <BarChart3 className="w-8 h-8 text-blue-600 animate-bounce" />
          Business Analytics
        </motion.h1>

        {/* KPI Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.12 } },
          }}
        >
          <KpiCard
            title="Today's Revenue"
            value={`Rp ${dashboard.todayRevenue.toLocaleString()}`}
            gradient="from-blue-500 to-indigo-600"
            icon={<DollarSign className="w-7 h-7 text-white/80" />}
          />
          <KpiCard
            title="Today's Profit"
            value={`Rp ${dashboard.todayProfit.toLocaleString()}`}
            gradient="from-green-500 to-emerald-600"
            icon={<TrendingUp className="w-7 h-7 text-white/80" />}
          />
          <KpiCard
            title="Revenue Growth"
            value={`${growth?.revenueGrowth ?? 0}%`}
            gradient="from-purple-500 to-pink-600"
            icon={<Sparkles className="w-7 h-7 text-white/80" />}
          />
          <KpiCard
            title="Business Health"
            value={health?.classification ?? "N/A"}
            gradient="from-orange-500 to-red-500"
            icon={<HeartPulse className="w-7 h-7 text-white/80 animate-pulse" />}
          />
        </motion.div>

        {/* Health Score Section */}
        <motion.div
          className="bg-white shadow-2xl rounded-2xl p-8 border flex flex-col md:flex-row items-center gap-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="flex items-center gap-6 w-full md:w-auto justify-center">
            {/* Progress Ring */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="44" fill="none"
                  stroke="#6366f1"
                  strokeWidth="8"
                  strokeDasharray={276.46}
                  strokeDashoffset={
                    276.46 - ((health?.overallScore ?? 0) / 100) * 276.46
                  }
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s' }}
                />
              </svg>
              <span className="text-3xl font-bold text-blue-700 z-10">
                {health?.overallScore ?? 0}
              </span>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900 mb-1">Business Health Score</p>
              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold shadow-md ${
                  health?.classification === "Excellent"
                    ? "bg-green-100 text-green-700"
                    : health?.classification === "Good"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {health?.classification}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Insight Panel */}
        <motion.div
          className="bg-white shadow-2xl rounded-2xl p-8 border"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 animate-gradient">
            <Sparkles className="w-6 h-6 text-purple-500 animate-bounce" />
            AI Insights
          </h2>

          <ul className="space-y-3 text-gray-700">
            {insight?.insights?.map((msg, i) => (
              <motion.li
                key={i}
                className="bg-gray-50 p-4 rounded-xl border hover:shadow-lg transition flex items-start gap-3"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Sparkles className="w-5 h-5 text-blue-400 mt-1 animate-float" />
                <span>{msg}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  gradient,
  icon,
}: {
  title: string;
  value: string;
  gradient: string;
  icon: React.ReactNode;
}) {
  return (
    <motion.div
      className={`bg-gradient-to-r ${gradient} text-white p-6 rounded-2xl shadow-xl flex flex-col gap-2 items-start hover:scale-105 hover:shadow-2xl transition-transform duration-300`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="mb-2">{icon}</div>
      <p className="text-sm opacity-80">{title}</p>
      <h2 className="text-2xl font-bold mt-1">{value}</h2>
    </motion.div>
  );
}