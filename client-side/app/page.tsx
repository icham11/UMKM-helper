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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        {/* Navigation */}
        <nav className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">UMKM Helper</span>
          </div>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-6 py-2 text-blue-600 hover:text-blue-700 font-medium transition"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-md hover:shadow-lg"
            >
              Get Started
            </Link>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                Smart Business Management
              </div>

              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                Kelola Bisnis UMKM Anda dengan{" "}
                <span className="text-blue-600">Lebih Mudah</span>
              </h1>

              <p className="text-xl text-gray-600 leading-relaxed">
                Sistem manajemen lengkap untuk UMKM: POS, Inventory, Sales Analytics, dan AI-powered insights.
                Tingkatkan efisiensi bisnis Anda hari ini!
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/register"
                  className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition shadow-lg hover:shadow-xl text-center"
                >
                  Mulai Gratis
                </Link>
                <Link
                  href="/login"
                  className="px-8 py-4 bg-white text-gray-900 border-2 border-gray-200 rounded-lg hover:border-blue-600 hover:text-blue-600 font-semibold transition text-center"
                >
                  Login
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center gap-6 pt-8">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Gratis Forever
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  No Credit Card
                </div>
              </div>
            </div>

            {/* Right Column - Features Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-1">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Point of Sale</h3>
                <p className="text-sm text-gray-600">Transaksi cepat dengan support berbagai metode pembayaran</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-1 mt-8">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Inventory</h3>
                <p className="text-sm text-gray-600">Kelola stok dengan sistem FIFO otomatis</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-1">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Analytics</h3>
                <p className="text-sm text-gray-600">Dashboard real-time untuk insights bisnis</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-1 mt-8">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">AI Analysis</h3>
                <p className="text-sm text-gray-600">Rekomendasi bisnis powered by AI</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-6xl mx-auto mt-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Semua yang Anda Butuhkan dalam Satu Platform
            </h2>
            <p className="text-xl text-gray-600">
              Fitur lengkap untuk mengelola bisnis UMKM Anda
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">POS Modern</h3>
              <p className="text-gray-600">Support Cash, QRIS, Transfer, dan e-wallet via Midtrans</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Inventory FIFO</h3>
              <p className="text-gray-600">Tracking stok otomatis dengan perhitungan cost akurat</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Real-time Analytics</h3>
              <p className="text-gray-600">Dashboard lengkap dengan metrics dan charts</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto mt-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-12 text-center text-white shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Siap Tingkatkan Bisnis Anda?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Bergabung dengan UMKM Helper sekarang dan rasakan perbedaannya
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-semibold transition shadow-lg hover:shadow-xl"
          >
            Daftar Sekarang - Gratis!
          </Link>
        </div>

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-gray-200 text-center text-gray-600">
          <p>&copy; 2026 UMKM Helper. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
