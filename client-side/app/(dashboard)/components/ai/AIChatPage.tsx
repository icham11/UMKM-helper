"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  { icon: "📊", title: "Analisis Penjualan", prompt: "Tolong analisis detail penjualan 30 hari terakhir. Apa tren yang terlihat?" },
  { icon: "🥕", title: "Status Inventori", prompt: "Bagaimana status stok bahan baku? Mana yang perlu segera dibeli?" },
  { icon: "💰", title: "Optimasi Profit", prompt: "Berikan saran konkret untuk meningkatkan profit margin bisnis saya" },
  { icon: "🏆", title: "Produk Terlaris", prompt: "Analisis produk terlaris dan berikan strategi untuk memaksimalkan penjualannya" },
  { icon: "📈", title: "Prediksi Demand", prompt: "Prediksi demand produk untuk minggu depan berdasarkan data penjualan" },
  { icon: "🍽️", title: "Rekomendasi Menu", prompt: "Berikan rekomendasi menu baru yang potensial berdasarkan bahan yang tersedia" },
  { icon: "⚠️", title: "Analisis Risiko", prompt: "Identifikasi risiko bisnis saat ini dan berikan strategi mitigasinya" },
  { icon: "🎯", title: "Strategi Harga", prompt: "Evaluasi strategi harga produk saya dan berikan saran penyesuaian" },
];

const SOURCE_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  product: { emoji: "📦", label: "Produk", color: "bg-blue-100 text-blue-700" },
  ingredient: { emoji: "🧂", label: "Bahan", color: "bg-green-100 text-green-700" },
  sale: { emoji: "💰", label: "Penjualan", color: "bg-yellow-100 text-yellow-700" },
  recipe: { emoji: "📋", label: "Resep", color: "bg-purple-100 text-purple-700" },
  metric: { emoji: "📊", label: "Metrik", color: "bg-indigo-100 text-indigo-700" },
  health: { emoji: "🏥", label: "Kesehatan", color: "bg-red-100 text-red-700" },
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

  const createNewChat = async () => {
    setMessages([]);
    setCurrentSession(null);
    setStreamingContent("");
    setStreamingSources([]);
    setShowSidebar(false);
    try {
      const res = await fetch("/api/ai/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentSession(data.session.id);
        fetchSessions();
      }
    } catch { /* ignore */ }
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
          sessionId: currentSession,
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
    } catch {
      try {
        const allMessages = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: allMessages, sessionId: currentSession }),
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
          { id: (Date.now() + 1).toString(), role: "assistant", content: "❌ Terjadi kesalahan. Coba lagi.", timestamp: new Date() },
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
      <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2 border-t border-gray-100">
        <span className="text-[10px] text-gray-400">📎 Sumber:</span>
        {uniqueTypes.map((type) => {
          const info = SOURCE_LABELS[type] || { emoji: "📄", label: type, color: "bg-gray-100 text-gray-700" };
          const count = sources.filter((s) => s.sourceType === type).length;
          const bestSim = Math.max(...sources.filter((s) => s.sourceType === type).map((s) => s.similarity));
          return (
            <span
              key={type}
              className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${info.color}`}
              title={`${count} dokumen, relevansi ${(bestSim * 100).toFixed(0)}%`}
            >
              {info.emoji} {info.label} ({count})
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative flex h-[calc(100vh-200px)] min-h-[500px] bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      {/* ═══ Sidebar Overlay ═══ */}
      <AnimatePresence>
        {showSidebar && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 z-10"
              onClick={() => setShowSidebar(false)}
            />
            {/* Sidebar */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute left-0 top-0 bottom-0 w-72 bg-white z-20 shadow-2xl flex flex-col border-r border-gray-200"
            >
              {/* Sidebar Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="text-sm font-bold text-gray-800">💬 Chat Sessions</h3>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="text-gray-400 hover:text-gray-600 transition p-1"
                >
                  ✕
                </button>
              </div>

              <div className="p-3">
                <button
                  onClick={createNewChat}
                  className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-xl hover:bg-indigo-700 transition font-medium text-sm flex items-center justify-center gap-2"
                >
                  ➕ New Chat
                </button>
              </div>

              {/* Session List */}
              <div className="flex-1 overflow-y-auto px-3 space-y-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition ${
                      currentSession === session.id
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                    onClick={() => loadSession(session.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{session.title}</p>
                      <p className="text-xs text-gray-400">{session._count.messages} pesan</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition p-1 text-xs"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <p className="text-center text-gray-400 text-xs py-8">Belum ada sesi chat</p>
                )}
              </div>

              {/* RAG Status */}
              <div className="p-3 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${ragStatus?.indexed ? "bg-green-500" : "bg-red-400"}`} />
                    <span className="text-[10px] font-medium text-gray-600">
                      {ragStatus?.indexed ? `🧠 ${ragStatus.documentCount} vektor` : "Belum diindeks"}
                    </span>
                  </div>
                  <button
                    onClick={handleSyncData}
                    disabled={indexing}
                    className="text-[10px] px-2.5 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 font-medium text-gray-600 transition"
                  >
                    {indexing ? "⏳" : "🔄"} Sync
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ Main Chat Area ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="text-white/80 hover:text-white transition p-1.5 rounded-lg hover:bg-white/10"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-base shrink-0">
            🤖
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-sm truncate">AI Business Assistant</h2>
              {ragStatus?.indexed && (
                <span className="text-[9px] bg-white/20 text-white/90 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0">
                  🧠 RAG
                </span>
              )}
            </div>
            <p className="text-indigo-200 text-[11px] truncate">
              GROQ + Gemini • {ragStatus?.documentCount || 0} vektor aktif
            </p>
          </div>
          <button
            onClick={handleSyncData}
            disabled={indexing}
            className="text-white/60 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition shrink-0 hidden sm:block"
            title="Sync data bisnis"
          >
            {indexing ? "⏳" : "🔄"}
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50/80 to-white">
          {/* Empty State */}
          {messages.length === 0 && !streamingContent && (
            <div className="text-center py-6">
              <div className="text-5xl mb-3">🤖</div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">AI Business Assistant</h3>
              <p className="text-gray-500 text-sm mb-3 max-w-sm mx-auto">
                Tanyakan apa saja tentang bisnis Anda.
              </p>

              {ragStatus?.indexed ? (
                <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-1.5 rounded-full mb-5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  🧠 RAG aktif — {ragStatus.documentCount} dokumen
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 mb-5">
                  <span className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-full">
                    ⚠️ Data belum diindeks
                  </span>
                  <button
                    onClick={handleSyncData}
                    disabled={indexing}
                    className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {indexing ? "⏳ Mengindeks..." : "🔄 Index Data Sekarang"}
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
                    <span className="text-xl group-hover:scale-110 transition-transform">{sp.icon}</span>
                    <span className="text-[11px] font-medium text-gray-600 leading-tight">{sp.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message List */}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex items-start gap-2.5 ${msg.role === "user" ? "max-w-[85%]" : "max-w-[90%]"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5">
                    🤖
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
                  <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-sm text-white shrink-0 mt-0.5">
                    👤
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Streaming */}
          {streamingContent && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2.5 max-w-[90%]">
                <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5">
                  🤖
                </div>
                <div className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed bg-white text-gray-700 border border-gray-200 rounded-bl-sm shadow-sm overflow-hidden">
                  <MarkdownRenderer content={streamingContent} />
                  <span className="inline-block w-1.5 h-4 bg-indigo-500 rounded animate-pulse ml-0.5" />
                  {streamingSources.length > 0 && <SourceBadges sources={streamingSources} />}
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && !streamingContent && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-sm shrink-0">
                  🤖
                </div>
                <div className="bg-white rounded-2xl px-4 py-3 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-[11px] text-gray-400">Mencari data relevan...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-gray-100 bg-white shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan tentang bisnis Anda..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 max-h-28"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition shrink-0"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-[9px] text-gray-400 mt-1.5 text-center">
            🔒 Aman • 🧠 RAG Search • GROQ + Gemini
          </p>
        </div>
      </div>
    </div>
  );
}

