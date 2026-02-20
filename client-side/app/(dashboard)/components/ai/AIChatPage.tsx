"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import MarkdownRenderer from "./MarkdownRenderer";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
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

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
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
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/ai/sessions");
      const data = await res.json();
      if (data.success) setSessions(data.sessions);
    } catch { /* ignore */ }
  };

  const loadSession = async (sessionId: number) => {
    setCurrentSession(sessionId);
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

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
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
        },
      ]);
      setStreamingContent("");
    } catch {
      // Fallback non-streaming
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
            { id: (Date.now() + 1).toString(), role: "assistant", content: data.message.content, timestamp: new Date() },
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


  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Sessions Sidebar */}
      {showSidebar && (
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col"
        >
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={createNewChat}
              className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-xl hover:bg-indigo-700 transition font-medium text-sm flex items-center justify-center gap-2"
            >
              ➕ New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition ${
                  currentSession === session.id
                    ? "bg-indigo-100 text-indigo-700"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
                onClick={() => loadSession(session.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.title}</p>
                  <p className="text-xs text-gray-500">{session._count.messages} messages</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition p-1"
                >
                  🗑️
                </button>
              </div>
            ))}

            {sessions.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">Belum ada sesi chat</p>
            )}
          </div>
        </motion.div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="text-white/70 hover:text-white transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-lg">
              🤖
            </div>
            <div>
              <h2 className="text-white font-bold">AI Business Assistant</h2>
              <p className="text-indigo-200 text-xs">Powered by GROQ AI • Analisis real-time</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white">
          {messages.length === 0 && !streamingContent && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">AI Business Assistant</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Tanyakan apa saja tentang bisnis Anda. Saya akan menganalisis data real-time dan memberikan insight yang actionable.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-3xl mx-auto">
                {SUGGESTION_PROMPTS.map((sp, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(sp.prompt)}
                    className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md transition text-center group"
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">{sp.icon}</span>
                    <span className="text-xs font-medium text-gray-700">{sp.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="flex items-start gap-3 max-w-[80%]">
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-1">
                    🤖
                  </div>
                )}
                <div
                  className={`rounded-2xl px-5 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-md"
                      : "bg-white text-gray-700 border border-gray-200 rounded-bl-md shadow-sm"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <MarkdownRenderer content={msg.content} />
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-sm text-white flex-shrink-0 mt-1">
                    👤
                  </div>
                )}
              </div>
            </div>
          ))}

          {streamingContent && (
            <div className="flex justify-start">
              <div className="flex items-start gap-3 max-w-[80%]">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-1">
                  🤖
                </div>
                <div className="rounded-2xl px-5 py-3 text-sm leading-relaxed bg-white text-gray-700 border border-gray-200 rounded-bl-md shadow-sm">
                  <MarkdownRenderer content={streamingContent} />
                  <span className="inline-block w-1.5 h-4 bg-indigo-500 rounded animate-pulse ml-0.5" />
                </div>
              </div>
            </div>
          )}

          {isLoading && !streamingContent && (
            <div className="flex justify-start">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                  🤖
                </div>
                <div className="bg-white rounded-2xl px-5 py-3 border border-gray-200 shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex gap-3 items-end max-w-4xl mx-auto">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan tentang bisnis Anda... (Enter untuk kirim, Shift+Enter baris baru)"
              rows={2}
              className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 max-h-32"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex-shrink-0"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            🔒 Data bisnis Anda diproses secara aman • Powered by GROQ AI
          </p>
        </div>
      </div>
    </div>
  );
}


