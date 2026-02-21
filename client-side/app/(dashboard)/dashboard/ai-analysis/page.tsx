"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import ImageAnalyzer from "@/app/(dashboard)/components/ai/ImageAnalyzer";
import AIChatPage from "@/app/(dashboard)/components/ai/AIChatPage";
import SmartInsightsPanel from "@/app/(dashboard)/components/ai/SmartInsightsPanel";

type AITab = "chat" | "insights" | "image";

export default function AIAnalysisPage() {
  const [activeTab, setActiveTab] = useState<AITab>("chat");

  const tabs: { id: AITab; label: string; icon: string; description: string }[] = [
    { id: "chat", label: "AI Assistant", icon: "🤖", description: "Chat RAG-powered dengan AI" },
    { id: "insights", label: "Smart Insights", icon: "🧠", description: "Analisis & prediksi otomatis" },
    { id: "image", label: "Image Analysis", icon: "📸", description: "Analisis gambar invoice/stok" },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-indigo-50 via-white to-blue-100 py-12 px-2 md:px-8" style={{ minHeight: '100vh', paddingBottom: '64px' }}>
      {/* Header */}
      <div className="w-full max-w-3xl mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-indigo-700">🤖 AI Center</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Pusat AI untuk analisis bisnis, prediksi, dan rekomendasi otomatis
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="w-full max-w-3xl flex gap-3 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center gap-3 px-5 py-3 rounded-xl transition font-medium text-base shadow-sm border ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white border-indigo-600 shadow-lg"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-indigo-200"
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <div className="text-left">
              <p className="text-sm font-semibold">{tab.label}</p>
              <p className={`text-xs ${activeTab === tab.id ? "text-indigo-200" : "text-gray-500"}`}>
                {tab.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-3xl"
      >
        {activeTab === "chat" && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <AIChatPage />
          </div>
        )}
        {activeTab === "insights" && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <SmartInsightsPanel />
          </div>
        )}
        {activeTab === "image" && (
          <div className="space-y-4">
            <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 shadow">
              <div className="flex items-start gap-3">
                <div className="text-2xl">📸</div>
                <div>
                  <h3 className="font-semibold text-indigo-700">Fitur AI Image Analysis</h3>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>✅ Invoice OCR - Extract data dari faktur</li>
                    <li>✅ Receipt Analysis - Analisis struk pembelian</li>
                    <li>✅ Stock Photo - Hitung inventory dari foto</li>
                    <li>✅ Product Analysis - Analisis produk otomatis</li>
                    <li>⏱️ Auto-delete - Gambar terhapus otomatis setelah 1 menit</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <ImageAnalyzer />
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200 shadow">
              <div className="flex items-start gap-3">
                <div className="text-2xl">⚠️</div>
                <div>
                  <h3 className="font-semibold text-yellow-700">Penting!</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Gambar yang diupload akan <strong>otomatis terhapus setelah 1 menit</strong> untuk menghemat storage.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
