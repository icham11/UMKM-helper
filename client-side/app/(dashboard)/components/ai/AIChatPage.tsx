"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Send,
  Trash2,
  Plus,
  Bot,
  User,
  Menu,
  X,
  RefreshCw,
  Database,
  BarChart3,
  Package,
  TrendingUp,
  Target,
  Utensils,
  AlertTriangle,
  DollarSign,
  Paperclip,
  FileText,
  Brain,
} from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";

interface SourceRef {
  sourceType: string;
  similarity: number;
  content: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: SourceRef[];
}

interface ChatSession {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

interface RAGStatus {
  indexed: boolean;
  documentCount: number;
  lastUpdated: string | null;
}

const SUGGESTION_PROMPTS = [
  { icon: BarChart3, title: "Analisis Penjualan", prompt: "Tolong analisis detail penjualan 30 hari terakhir. Apa tren yang terlihat?" },
  { icon: Package, title: "Status Inventori", prompt: "Bagaimana status stok bahan baku? Mana yang perlu segera dibeli?" },
  { icon: DollarSign, title: "Optimasi Profit", prompt: "Berikan saran konkret untuk meningkatkan profit margin bisnis saya" },
  { icon: TrendingUp, title: "Produk Terlaris", prompt: "Analisis produk terlaris dan berikan strategi untuk memaksimalkan penjualannya" },
  { icon: Target, title: "Prediksi Demand", prompt: "Prediksi demand produk untuk minggu depan berdasarkan data penjualan" },
  { icon: Utensils, title: "Rekomendasi Menu", prompt: "Berikan rekomendasi menu baru yang potensial berdasarkan bahan yang tersedia" },
  { icon: AlertTriangle, title: "Analisis Risiko", prompt: "Identifikasi risiko bisnis saat ini dan berikan strategi mitigasinya" },
  { icon: DollarSign, title: "Strategi Harga", prompt: "Evaluasi strategi harga produk saya dan berikan saran penyesuaian" },
];

const SOURCE_ICONS: Record<string, { icon: typeof Package; label: string; color: string }> = {
  product: { icon: Package, label: "Produk", color: "bg-blue-50 text-blue-600 border-blue-200" },
  ingredient: { icon: Package, label: "Bahan", color: "bg-green-50 text-green-600 border-green-200" },
  sale: { icon: DollarSign, label: "Penjualan", color: "bg-amber-50 text-amber-600 border-amber-200" },
  sale_detail: { icon: FileText, label: "Detail Penjualan", color: "bg-amber-50 text-amber-600 border-amber-200" },
  recipe: { icon: Utensils, label: "Resep", color: "bg-purple-50 text-purple-600 border-purple-200" },
  metric: { icon: BarChart3, label: "Metrik", color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
  health: { icon: AlertTriangle, label: "Kesehatan", color: "bg-red-50 text-red-600 border-red-200" },
  inventory_batch: { icon: Package, label: "Stok Batch", color: "bg-teal-50 text-teal-600 border-teal-200" },
  inventory_movement: { icon: TrendingUp, label: "Pergerakan Stok", color: "bg-cyan-50 text-cyan-600 border-cyan-200" },
  debt: { icon: FileText, label: "Kasbon", color: "bg-orange-50 text-orange-600 border-orange-200" },
  category: { icon: FileText, label: "Kategori", color: "bg-gray-50 text-gray-600 border-gray-200" },
  business: { icon: BarChart3, label: "Bisnis", color: "bg-slate-50 text-slate-600 border-slate-200" },
};

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingSources, setStreamingSources] = useState<SourceRef[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [ragStatus, setRagStatus] = useState<RAGStatus | null>(null);
  const [indexing, setIndexing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  useEffect(() => {
    fetchSessions();
    fetchRAGStatus();
  }, []);

  // ─── RAG Status ───
  const fetchRAGStatus = async () => {
    try {
      const res = await fetch("/api/ai/rag/index");
      const data = await res.json();
      if (data.success) {
        setRagStatus({ indexed: data.indexed, documentCount: data.documentCount, lastUpdated: data.lastUpdated });
      }
    } catch { /* ignore */ }
  };

  const handleSyncData = async () => {
    setIndexing(true);
    try {
      const res = await fetch("/api/ai/rag/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        await fetchRAGStatus();
      }
    } catch { /* ignore */ }
    finally { setIndexing(false); }
  };

  // ─── Sessions ───
  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/ai/sessions");
      const data = await res.json();
      if (data.success) setSessions(data.sessions);
    } catch { /* ignore */ }
  };

  const loadSession = async (sessionId: number) => {
    setCurrentSession(sessionId);
    setShowSidebar(false);
    try {
      const res = await fetch(`/api/ai/chat?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(
          data.messages.map((m: { id: number; role: string; content: string; createdAt: string }) => ({
            id: m.id.toString(),
            role: m.role as "user" | "assistant",
            content: m.content,
            timestamp: new Date(m.createdAt),
          }))
        );
      }
    } catch { /* ignore */ }
  };

  const createNewChat = () => {
    setMessages([]);
    setCurrentSession(null);
    setStreamingContent("");
    setStreamingSources([]);
    setShowSidebar(false);
  };

  const deleteSession = async (sessionId: number) => {
    try {
      await fetch(`/api/ai/sessions?id=${sessionId}`, { method: "DELETE" });
      if (currentSession === sessionId) {
        setMessages([]);
        setCurrentSession(null);
      }
      fetchSessions();
    } catch { /* ignore */ }
  };

  // ─── Send Message ───
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");
    setStreamingSources([]);

    // Auto-create session if needed
    let sessionId = currentSession;
    if (!sessionId) {
      try {
        const res = await fetch("/api/ai/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Percakapan Baru" }),
        });
        const data = await res.json();
        if (data.success) {
          sessionId = data.session.id;
          setCurrentSession(sessionId);
        }
      } catch { /* ignore */ }
    }

    try {
      const allMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages,
          sessionId,
          stream: true,
        }),
      });

      if (!response.ok) throw new Error("Failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let fullContent = "";
      let capturedSources: SourceRef[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "sources" && Array.isArray(data.sources)) {
              capturedSources = data.sources;
              setStreamingSources(capturedSources);
              continue;
            }
            if (data.done) break;
            if (data.error) throw new Error(data.error);
            if (data.content) {
              fullContent += data.content;
              setStreamingContent(fullContent);
            }
          } catch { /* skip */ }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: fullContent || "Maaf, tidak bisa merespons.",
          timestamp: new Date(),
          sources: capturedSources.length > 0 ? capturedSources : undefined,
        },
      ]);
      setStreamingContent("");
      setStreamingSources([]);
      fetchSessions(); // Refresh to get auto-updated title
    } catch {
      try {
        const allMessages = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: allMessages, sessionId }),
        });
        const data = await response.json();
        if (data.success) {
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: data.message.content,
              timestamp: new Date(),
              sources: data.sources,
            },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: "assistant", content: "Terjadi kesalahan. Silakan coba lagi.", timestamp: new Date() },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, currentSession]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ─── Source Badge Component ───
  const SourceBadges = ({ sources }: { sources: SourceRef[] }) => {
    if (!sources || sources.length === 0) return null;
    const uniqueTypes = [...new Set(sources.map((s) => s.sourceType))];
    return (
      <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-gray-100">
        <Paperclip className="w-3 h-3 text-gray-400" />
        <span className="text-[10px] text-gray-400 mr-0.5">Sumber:</span>
        {uniqueTypes.map((type) => {
          const info = SOURCE_ICONS[type] || { icon: FileText, label: type, color: "bg-gray-50 text-gray-600 border-gray-200" };
          const IconComp = info.icon;
          const count = sources.filter((s) => s.sourceType === type).length;
          const bestSim = Math.max(...sources.filter((s) => s.sourceType === type).map((s) => s.similarity));
          return (
            <span
              key={type}
              className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border ${info.color}`}
              title={`${count} dokumen, relevansi ${(bestSim * 100).toFixed(0)}%`}
            >
              <IconComp className="w-3 h-3" />
              {info.label} ({count})
            </span>
          );
        })}
      </div>
    );
  };

  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Baru saja";
    if (mins < 60) return `${mins}m lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}j lalu`;
    const days = Math.floor(hours / 24);
    return `${days}h lalu`;
  };

  return (
    <div className="relative flex flex-col md:flex-row min-h-[500px] md:min-h-[600px] max-h-[85vh] bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 z-10"
              onClick={() => setShowSidebar(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute left-0 top-0 bottom-0 w-72 bg-white z-20 shadow-2xl flex flex-col border-r border-gray-200"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Riwayat Chat</h3>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="text-gray-400 hover:text-gray-600 transition p-1 rounded-md hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3">
                <button
                  onClick={createNewChat}
                  className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-xl hover:bg-indigo-700 transition font-medium text-sm flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Percakapan Baru
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 space-y-1">
                {sessions.filter((s) => s._count.messages > 0).map((session) => (
                  <div
                    key={session.id}
                    className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition ${
                      currentSession === session.id
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                    onClick={() => loadSession(session.id)}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <MessageCircle className={`w-3.5 h-3.5 shrink-0 ${currentSession === session.id ? "text-indigo-600" : "text-gray-400"}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{session.title}</p>
                        <p className="text-[11px] text-gray-400">{session._count.messages} pesan · {formatRelativeTime(session.updatedAt)}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <p className="text-center text-gray-400 text-xs py-8">Belum ada sesi chat</p>
                )}
              </div>

              <div className="p-3 border-t border-gray-100 bg-gray-50/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${ragStatus?.indexed ? "bg-green-500" : "bg-red-400"}`} />
                    <div className="flex items-center gap-1">
                      <Database className="w-3 h-3 text-gray-500" />
                      <span className="text-[10px] font-medium text-gray-600">
                        {ragStatus?.indexed ? `${ragStatus.documentCount} data tersinkronisasi` : "Data belum tersinkronisasi"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleSyncData}
                    disabled={indexing}
                    className="text-[10px] px-2.5 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 font-medium text-gray-600 transition flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${indexing ? "animate-spin" : ""}`} />
                    Sync
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 justify-between">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="text-white/80 hover:text-white transition p-1.5 rounded-lg hover:bg-white/10"
          >
            <Menu className="w-[18px] h-[18px]" />
          </button>
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-semibold text-sm truncate">AI Business Assistant</h2>
              {ragStatus?.indexed && (
                <span className="text-[9px] bg-white/20 text-white/90 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0 flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  Terhubung
                </span>
              )}
            </div>
            <p className="text-indigo-200 text-[11px] truncate">
              {ragStatus?.indexed
                ? `Data bisnis tersinkronisasi · ${ragStatus.documentCount} data terintegrasi`
                : "AI siap membantu bisnis Anda"}
            </p>
          </div>
          <button
            onClick={handleSyncData}
            disabled={indexing}
            className="text-white/60 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition shrink-0 hidden sm:flex items-center gap-1"
            title="Sync data bisnis"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${indexing ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50/80 to-white" style={{ minHeight: "350px", paddingBottom: "60px" }}>
          {messages.length === 0 && !streamingContent && (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bot className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">AI Business Assistant</h3>
              <p className="text-gray-500 text-sm mb-3 max-w-sm mx-auto">
                Tanyakan apa saja tentang bisnis Anda.
              </p>

              {ragStatus?.indexed ? (
                <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-1.5 rounded-full mb-5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <Brain className="w-3 h-3" />
                  Data bisnis terhubung — {ragStatus.documentCount} data siap dianalisis
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 mb-5">
                  <span className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" />
                    Data bisnis belum tersinkronisasi
                  </span>
                  <button
                    onClick={handleSyncData}
                    disabled={indexing}
                    className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3 h-3 ${indexing ? "animate-spin" : ""}`} />
                    {indexing ? "Menyinkronkan..." : "Sinkronkan Data Sekarang"}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 max-w-2xl mx-auto">
                {SUGGESTION_PROMPTS.map((sp, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(sp.prompt)}
                    className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow transition text-center group"
                  >
                    <sp.icon className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition" />
                    <span className="text-[11px] font-medium text-gray-600 leading-tight">{sp.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex items-start gap-2.5 ${msg.role === "user" ? "max-w-[85%]" : "max-w-[90%]"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-indigo-600" />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed overflow-hidden ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-white text-gray-700 border border-gray-200 rounded-bl-sm shadow-sm"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <>
                      <MarkdownRenderer content={msg.content} />
                      {msg.sources && <SourceBadges sources={msg.sources} />}
                    </>
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </div>
          ))}

          {streamingContent && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2.5 max-w-[90%]">
                <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed bg-white text-gray-700 border border-gray-200 rounded-bl-sm shadow-sm overflow-hidden">
                  <MarkdownRenderer content={streamingContent} />
                  <span className="inline-block w-1.5 h-4 bg-indigo-500 rounded animate-pulse ml-0.5" />
                  {streamingSources.length > 0 && <SourceBadges sources={streamingSources} />}
                </div>
              </div>
            </div>
          )}

          {isLoading && !streamingContent && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="bg-white rounded-2xl px-4 py-3 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-[11px] text-gray-400">Sedang menganalisis...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t border-gray-100 bg-white shrink-0" style={{ position: "sticky", bottom: 0, zIndex: 10 }}>
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan tentang bisnis Anda..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 max-h-28 text-black placeholder-gray-400"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition shrink-0"
            >
              <Send className="w-[18px] h-[18px]" />
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <Database className="w-3 h-3 text-gray-300" />
            <p className="text-[9px] text-gray-400">
              AI menganalisis data bisnis Anda secara real-time
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

