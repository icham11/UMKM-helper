"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Brain, Camera } from "lucide-react";
import ImageAnalyzer from "@/app/(dashboard)/components/ai/ImageAnalyzer";
import AIChatPage from "@/app/(dashboard)/components/ai/AIChatPage";
import SmartInsightsPanel from "@/app/(dashboard)/components/ai/SmartInsightsPanel";

type AITab = "chat" | "insights" | "image";

export default function AIAnalysisPage() {
  const [activeTab, setActiveTab] = useState<AITab>("chat");

  const tabs: { id: AITab; label: string; icon: typeof Bot; description: string }[] = [
    { id: "chat", label: "AI Assistant", icon: Bot, description: "Tanya jawab dengan AI tentang bisnis Anda" },
    { id: "insights", label: "Smart Insights", icon: Brain, description: "Analisis & prediksi otomatis" },
    { id: "image", label: "Analisis Gambar", icon: Camera, description: "Analisis foto invoice, struk, & stok" },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-indigo-50 via-white to-blue-100 py-8 px-2 md:px-8" style={{ minHeight: "100vh", paddingBottom: "64px" }}>
      {/* Header */}
      <div className="w-full max-w-4xl mb-6">
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Center</h1>
              <p className="text-gray-500 text-sm">
                Pusat AI untuk analisis bisnis, prediksi, dan rekomendasi
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="w-full max-w-4xl flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium text-sm border ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-indigo-200"
            }`}
          >
            <tab.icon className={`w-5 h-5 shrink-0 ${activeTab === tab.id ? "text-white" : "text-gray-400"}`} />
            <div className="text-left min-w-0">
              <p className="font-semibold text-sm">{tab.label}</p>
              <p className={`text-xs truncate ${activeTab === tab.id ? "text-indigo-200" : "text-gray-500"}`}>
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
        className="w-full max-w-4xl"
      >
        {activeTab === "chat" && (
          <AIChatPage />
        )}
        {activeTab === "insights" && (
          <SmartInsightsPanel />
        )}
        {activeTab === "image" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <ImageAnalyzer />
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-start gap-3">
                <Camera className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold text-amber-800 text-sm">Catatan</h3>
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
