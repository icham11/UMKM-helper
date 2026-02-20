"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, TrendingUp, Package, BarChart3, Sparkles, CheckCircle } from "lucide-react";

function getCookie(name: string): string | null {
  if (typeof window === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

export default function LandingPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = getCookie("token");
    if (token) {
      // Redirect to home if already authenticated
      router.push("/home");
    } else {
      // Use setTimeout to avoid setState during render
      setTimeout(() => setIsChecking(false), 0);
    }
  }, [router]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-50 flex flex-col relative overflow-hidden">
      {/* Background SVG Pattern */}
      <svg className="absolute inset-0 w-full h-full z-0" style={{pointerEvents:'none'}}>
        <defs>
          <radialGradient id="bg-radial" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg-radial)" />
        <circle cx="20%" cy="80%" r="120" fill="#60a5fa" opacity="0.08" />
        <circle cx="80%" cy="20%" r="100" fill="#a5b4fc" opacity="0.10" />
        <circle cx="50%" cy="50%" r="180" fill="#6366f1" opacity="0.04" />
      </svg>

      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-8 h-8 text-blue-600 drop-shadow-md animate-bounce" />
          <span className="text-2xl font-bold text-gray-900 tracking-tight animate-gradient">UMKM Helper</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="px-6 py-2 text-blue-600 hover:text-blue-700 font-medium transition">Login</Link>
          <Link href="/register" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-md hover:shadow-lg">Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
        {/* Left Column */}
        <div className="flex-1 space-y-8 animate-fadeIn">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium shadow-sm animate-pulse">
            <Sparkles className="w-4 h-4 animate-spin-slow" />
            Smart Business Management
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight drop-shadow-xl animate-gradient">
            Kelola Bisnis UMKM Anda dengan <span className="text-blue-600 animate-gradient">Lebih Mudah</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed max-w-lg animate-fadeInUp">
            Sistem manajemen lengkap untuk UMKM: POS, Inventory, Sales Analytics, dan AI-powered insights.<br />
            Tingkatkan efisiensi bisnis Anda hari ini!
          </p>
         
          <div className="flex items-center gap-6 pt-8">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="w-5 h-5 text-green-500 animate-pulse" />
              Gratis Forever
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="w-5 h-5 text-green-500 animate-pulse" />
              No Credit Card
            </div>
          </div>
        </div>
        {/* Right Column */}
        <div className="flex-1 grid grid-cols-2 gap-6 animate-fadeIn">
          {/* Floating Cards */}
          <div className="bg-white p-6 rounded-2xl shadow-2xl hover:shadow-blue-300/40 transition transform hover:-translate-y-3 hover:scale-110 group animate-float min-h-55 min-w-65 flex flex-col justify-between grow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:animate-spin">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2 animate-gradient">Point of Sale</h3>
            <p className="text-sm text-gray-600">Transaksi cepat dengan support berbagai metode pembayaran</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-2xl hover:shadow-green-300/40 transition transform hover:-translate-y-3 hover:scale-110 group animate-float-delay min-h-55 min-w-65 flex flex-col justify-between grow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:animate-spin">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2 animate-gradient">Inventory</h3>
            <p className="text-sm text-gray-600">Kelola stok dengan sistem FIFO otomatis</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-2xl hover:shadow-purple-300/40 transition transform hover:-translate-y-3 hover:scale-110 group animate-float min-h-55 min-w-65 flex flex-col justify-between grow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:animate-spin">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2 animate-gradient">Analytics</h3>
            <p className="text-sm text-gray-600">Dashboard real-time untuk insights bisnis</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-2xl hover:shadow-orange-300/40 transition transform hover:-translate-y-3 hover:scale-110 group animate-float-delay min-h-55 min-w-65 flex flex-col justify-between grow">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4 group-hover:animate-spin">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2 animate-gradient">AI Analysis</h3>
            <p className="text-sm text-gray-600">Rekomendasi bisnis powered by AI</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto mt-24 px-4 animate-fadeIn relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 drop-shadow-xl animate-gradient">Semua yang Anda Butuhkan dalam Satu Platform</h2>
          <p className="text-xl text-gray-600 animate-fadeInUp">Fitur lengkap untuk mengelola bisnis UMKM Anda</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center bg-white rounded-2xl p-8 shadow-2xl hover:shadow-blue-300/40 transition hover:-translate-y-3 hover:scale-110 animate-float">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <ShoppingCart className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="font-bold text-lg text-gray-900 mb-2 animate-gradient">POS Modern</h3>
            <p className="text-gray-600">Support Cash, QRIS, Transfer, dan e-wallet via Midtrans</p>
          </div>
          <div className="text-center bg-white rounded-2xl p-8 shadow-2xl hover:shadow-green-300/40 transition hover:-translate-y-3 hover:scale-110 animate-float-delay">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Package className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-bold text-lg text-gray-900 mb-2 animate-gradient">Inventory FIFO</h3>
            <p className="text-gray-600">Tracking stok otomatis dengan perhitungan cost akurat</p>
          </div>
          <div className="text-center bg-white rounded-2xl p-8 shadow-2xl hover:shadow-purple-300/40 transition hover:-translate-y-3 hover:scale-110 animate-float">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="font-bold text-lg text-gray-900 mb-2 animate-gradient">Real-time Analytics</h3>
            <p className="text-gray-600">Dashboard lengkap dengan metrics dan charts</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto mt-24 bg-linear-to-r from-blue-600 to-indigo-600 rounded-3xl p-12 text-center text-white shadow-2xl animate-fadeIn relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 animate-gradient">Siap Tingkatkan Bisnis Anda?</h2>
        <p className="text-xl mb-8 text-blue-100 animate-fadeInUp">Bergabung dengan UMKM Helper sekarang dan rasakan perbedaannya</p>
        <Link href="/register" className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-semibold transition shadow-lg hover:shadow-xl animate-pop">Daftar Sekarang - Gratis!</Link>
      </section>

      {/* Footer */}
      <footer className="mt-24 pt-8 border-t border-gray-200 text-center text-gray-600 relative z-10">
        <p>&copy; 2026 UMKM Helper. All rights reserved.</p>
      </footer>
      {/* Custom Animations (Tailwind CSS or global styles required) */}
    </div>
  );
}
