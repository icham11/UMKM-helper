"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ReceiptText,
  Box,
  Leaf,
  BookOpen,
  BarChart2,
  Bot,
  AlertTriangle,
  TrendingDown,
  Sparkles
} from "lucide-react";

import { motion } from "framer-motion";
import StatCard from "../(dashboard)/components/StatCard";
import { HeartPulse, ShoppingCart, ListOrdered, AlertCircle } from "lucide-react";
import RevenueChart from "../(dashboard)/components/charts/RevenueChart";
import { useBusiness } from "@/context/BusinessContext";

function HomePage() {
  const router = useRouter();
  const { business, loading } = useBusiness();
  // null = not checked yet, true = checked and not cashier, false = checked and cashier
  const [roleChecked, setRoleChecked] = useState<null | boolean>(null);

  // Kasir guard — middleware handles this, but this is a fallback
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("auth failed");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data?.data?.role === "Cashier") {
          window.location.replace("/pos");
        } else {
          setRoleChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) setRoleChecked(true);
      });
    return () => { cancelled = true; };
  }, []);

  // Show loading until role is checked
  if (roleChecked === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-100 via-indigo-100 to-blue-200">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-indigo-500 font-medium">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-100 via-indigo-100 to-blue-200 px-2 py-6 md:px-8 md:py-10 space-y-10 relative overflow-x-hidden flex flex-col">
      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <svg width="100%" height="100%" className="opacity-10 animate-fadeIn" style={{position:'absolute',top:0,left:0}}>
          <defs>
            <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="#3b82f6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>
      {/* Hero Section */}
      <motion.section initial={{opacity:0, y:-30}} animate={{opacity:1, y:0}} transition={{duration:0.7}} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
        <motion.div initial={{opacity:0, x:-40}} animate={{opacity:1, x:0}} transition={{duration:0.8}} className="mb-4 md:mb-0">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-2 drop-shadow-lg tracking-tight bg-linear-to-r from-blue-600 via-indigo-500 to-blue-400 bg-clip-text text-transparent animate-gradient">
            {loading ? "Memuat..." : business?.name || "UMKM Helper"}
          </h1>
          <p className="text-blue-500 text-base sm:text-lg max-w-md font-medium animate-fadeIn">Selamat datang di pusat kontrol bisnis UMKM Anda!</p>
        </motion.div>
        <motion.div initial={{opacity:0, x:40}} animate={{opacity:1, x:0}} transition={{duration:0.8}} className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 w-full md:w-auto">
          <StatCard
            title="Health Score"
            value={82}
            icon={<HeartPulse size={28} className="text-blue-500 group-hover:animate-spin" />}
            tooltip="Skor kesehatan bisnis Anda berdasarkan performa dan stok."
            colorClass="from-blue-400 to-blue-600"
          />
          <StatCard
            title="Sales Today"
            value={1200000}
            icon={<ShoppingCart size={28} className="text-indigo-500 group-hover:scale-110 transition" />}
            tooltip="Total penjualan hari ini."
            colorClass="from-indigo-400 to-blue-400"
          />
          <StatCard
            title="Transactions"
            value={42}
            icon={<ListOrdered size={28} className="text-blue-400 group-hover:-rotate-12 transition" />}
            tooltip="Jumlah transaksi hari ini."
            colorClass="from-blue-300 to-indigo-300"
          />
          <StatCard
            title="Low Stock"
            value={3}
            icon={<AlertCircle size={28} className="text-red-400 group-hover:animate-bounce" />}
            tooltip="Jumlah produk dengan stok rendah."
            colorClass="from-red-200 to-blue-200"
          />
        </motion.div>
      </motion.section>

      {/* Divider */}
      <div className="h-1 w-full bg-linear-to-r from-blue-200 via-indigo-200 to-blue-100 rounded-full my-2 opacity-60 animate-pulse" />

      {/* Revenue Chart Section */}
      <motion.section initial={{opacity:0, y:30}} animate={{opacity:1, y:0}} transition={{duration:0.7, delay:0.2}} className="bg-white/70 backdrop-blur-md p-4 sm:p-6 rounded-2xl shadow-2xl border-4 border-transparent bg-clip-padding border-gradient-to-br from-blue-200 via-indigo-200 to-blue-100 relative z-10 animate-fadeIn">
        <RevenueChart />
      </motion.section>

      {/* Divider */}
      <div className="h-1 w-full bg-linear-to-r from-blue-100 via-indigo-100 to-blue-200 rounded-full my-2 opacity-50 animate-pulse" />

      {/* Quick Actions */}
      <motion.section initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.7, delay:0.15}} className="relative z-10">
        <h2 className="text-lg sm:text-xl font-bold text-blue-700 mb-4 animate-fadeIn">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          <ActionCard title="Masuk Kasir" icon={<ReceiptText size={32} />} onClick={() => router.push("/pos")} color="from-blue-50 to-blue-200" />
          <ActionCard title="Kelola Produk" icon={<Box size={32} />} onClick={() => router.push("/dashboard/products")} color="from-blue-50 to-indigo-100" />
          <ActionCard title="Ingredients" icon={<Leaf size={32} />} onClick={() => router.push("/dashboard/ingredients")} color="from-blue-50 to-blue-100" />
          <ActionCard title="Recipe" icon={<BookOpen size={32} />} onClick={() => router.push("/dashboard/recipes")} color="from-blue-50 to-blue-200" />
          <ActionCard title="Dashboard" icon={<BarChart2 size={32} />} onClick={() => router.push("/dashboard")} color="from-blue-50 to-indigo-100" />
          <ActionCard title="AI Insight" icon={<Bot size={32} />} onClick={() => router.push("/dashboard/ai")} color="from-blue-50 to-blue-200" />
        </div>
      </motion.section>

      {/* Divider */}
      <div className="h-1 w-full bg-linear-to-r from-blue-200 via-indigo-200 to-blue-100 rounded-full my-2 opacity-40 animate-pulse" />

      {/* Amazing Insights & Alerts */}
      <motion.section initial={{opacity:0, y:30}} animate={{opacity:1, y:0}} transition={{duration:0.7, delay:0.3}} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 animate-fadeIn">
        <motion.div initial={{opacity:0, x:-30}} animate={{opacity:1, x:0}} transition={{duration:0.7, delay:0.35}} className="bg-white/70 backdrop-blur-md rounded-2xl shadow-xl p-6 border border-blue-100 relative">
          <h2 className="text-lg font-semibold text-blue-700 mb-4">Alerts & Notifications</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2 text-red-500 font-semibold">
              <AlertTriangle size={18} className="inline-block" />
              Tepung tersisa 2kg (Low Stock)
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 animate-pulse">!</span>
            </li>
            <li className="flex items-center gap-2 text-yellow-600 font-semibold">
              <TrendingDown size={18} className="inline-block" />
              Revenue turun 15% dari kemarin
            </li>
            <li className="flex items-center gap-2 text-blue-600 font-semibold">
              <Sparkles size={18} className="inline-block" />
              AI memiliki 2 insight baru untuk Anda
            </li>
          </ul>
        </motion.div>
        <motion.div initial={{opacity:0, x:30}} animate={{opacity:1, x:0}} transition={{duration:0.7, delay:0.35}} className="bg-linear-to-br from-blue-100 to-white/80 rounded-2xl shadow-xl p-6 flex flex-col justify-between border border-blue-100 relative">
          <h2 className="text-lg font-semibold text-blue-700 mb-4 flex items-center gap-2"><Bot size={20} />AI Insight</h2>
          <p className="text-sm text-gray-700 mb-2">
            Pendapatan naik <span className="font-bold text-green-600">12%</span> minggu ini. Promosikan <span className="font-semibold text-blue-700">Roti Coklat</span> untuk margin maksimal!
          </p>
          <p className="text-xs text-gray-400 mt-2">Powered by AI</p>
        </motion.div>
      </motion.section>

      {/* Divider */}
      <div className="h-1 w-full bg-linear-to-r from-blue-100 via-indigo-100 to-blue-200 rounded-full my-2 opacity-30 animate-pulse" />

      {/* Bottom Grid Summary */}
      <motion.section initial={{opacity:0, y:30}} animate={{opacity:1, y:0}} transition={{duration:0.7, delay:0.4}} className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-6 relative z-10 animate-fadeIn">
        <SummaryCard title="Produk Terjual" value="120" />
        <SummaryCard title="Total Revenue" value="Rp 1.200.000" />
        <SummaryCard title="Total Profit" value="Rp 450.000" />
        <SummaryCard title="Waste" value="3%" />
      </motion.section>
    </div>
  );
}

export default HomePage;

// ActionCard dengan icon lucide-react dan animasi hover
function ActionCard({
  title,
  icon,
  onClick,
  color = "from-white to-blue-50"
}: {
  title: string
  icon: React.ReactNode
  onClick: () => void
  color?: string
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.08, boxShadow: "0 8px 32px 0 rgba(59,130,246,0.15)" }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`group w-full flex flex-col items-center justify-center text-center bg-linear-to-br ${color} rounded-xl shadow p-4 sm:p-6 border border-blue-100 hover:shadow-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300`}
      tabIndex={0}
    >
      <span className="mb-2 group-hover:scale-110 transition-transform text-blue-600">{icon}</span>
      <span className="font-semibold text-blue-700 text-sm sm:text-base group-hover:text-indigo-700">{title}</span>
    </motion.button>
  )
}

function SummaryCard({
  title,
  value,
}: {
  title: string
  value: string
}) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: "0 8px 32px 0 rgba(59,130,246,0.10)" }}
      className="bg-white/80 backdrop-blur-md rounded-xl p-4 sm:p-5 shadow border border-blue-100 flex flex-col items-center transition">
      <p className="text-blue-500 text-xs mb-1 text-center">{title}</p>
      <p className="font-bold text-blue-700 text-lg sm:text-xl text-center">{value}</p>
    </motion.div>
  )
}
