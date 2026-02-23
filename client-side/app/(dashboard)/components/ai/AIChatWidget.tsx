"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Trash2,
  BarChart3,
  Package,
  Lightbulb,
  Trophy,
  History,
  Plus,
  ChevronLeft,
  Bot,
  User,
} from "lucide-react";
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
  updatedAt: string;
  _count: { messages: number };
}

const QUICK_PROMPTS = [
  { icon: BarChart3, label: "Analisis Penjualan", prompt: "Berikan analisis penjualan 30 hari terakhir" },
  { icon: Package, label: "Cek Stok", prompt: "Bagaimana status stok bahan baku saat ini?" },
  { icon: Lightbulb, label: "Saran Bisnis", prompt: "Berikan saran untuk meningkatkan profit bisnis saya" },
  { icon: Trophy, label: "Top Produk", prompt: "Apa saja produk terlaris bulan ini?" },
];

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  useEffect(() => {
    if (isOpen && view === "chat") {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, view]);

  // ─── Sessions ───
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/sessions");
      const data = await res.json();
      if (data.success) setSessions(data.sessions ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (isOpen) fetchSessions();
  }, [isOpen, fetchSessions]);

  const loadSession = useCallback(async (sessionId: number) => {
    setCurrentSessionId(sessionId);
    setView("chat");
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
  }, []);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setStreamingContent("");
    setCurrentSessionId(null);
    setView("chat");
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const deleteSession = useCallback(async (sessionId: number) => {
    try {
      await fetch(`/api/ai/sessions?id=${sessionId}`, { method: "DELETE" });
      if (currentSessionId === sessionId) {
        setMessages([]);
        setCurrentSessionId(null);
      }
      fetchSessions();
    } catch { /* ignore */ }
  }, [currentSessionId, fetchSessions]);

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

    let sessionId = currentSessionId;
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
          setCurrentSessionId(sessionId);
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
        body: JSON.stringify({ messages: allMessages, sessionId, stream: true }),
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
          content: fullContent || "Maaf, saya tidak bisa memberikan respons.",
          timestamp: new Date(),
        },
      ]);
      setStreamingContent("");
      fetchSessions();
    } catch {
      try {
        const allMessages = [...messages, userMessage].map((m) => ({ role: m.role, content: m.content }));
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: allMessages, sessionId, stream: false }),
        });
        const data = await response.json();
        if (data.success) {
          setMessages((prev) => [
            ...prev,
            { id: (Date.now() + 1).toString(), role: "assistant", content: data.message.content, timestamp: new Date() },
          ]);
          fetchSessions();
        } else {
          throw new Error(data.error);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: "assistant", content: "Maaf, terjadi kesalahan. Silakan coba lagi.", timestamp: new Date() },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, currentSessionId, fetchSessions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
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
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-shadow"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[400px] h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center gap-3 shrink-0">
              {view === "history" ? (
                <button onClick={() => setView("chat")} className="text-white/80 hover:text-white transition p-1">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              ) : (
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-sm truncate">
                  {view === "history" ? "Riwayat Chat" : "AI Assistant"}
                </h3>
                <p className="text-indigo-200 text-[11px] truncate">
                  {view === "history" ? `${sessions.filter((s) => s._count.messages > 0).length} percakapan` : "Siap membantu analisis bisnis Anda"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {view === "chat" && (
                  <>
                    <button
                      onClick={() => { fetchSessions(); setView("history"); }}
                      className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
                      title="Riwayat chat"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    <button
                      onClick={startNewChat}
                      className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
                      title="Chat baru"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* History View */}
            {view === "history" && (
              <div className="flex-1 overflow-y-auto">
                <div className="p-3">
                  <button
                    onClick={startNewChat}
                    className="w-full flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Percakapan Baru
                  </button>
                </div>
                <div className="px-3 pb-3 space-y-1">
                  {sessions.filter((s) => s._count.messages > 0).map((session) => (
                    <div
                      key={session.id}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition ${
                        currentSessionId === session.id ? "bg-indigo-50 border border-indigo-200" : "hover:bg-gray-50"
                      }`}
                      onClick={() => loadSession(session.id)}
                    >
                      <MessageCircle className={`w-4 h-4 shrink-0 ${currentSessionId === session.id ? "text-indigo-600" : "text-gray-400"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{session.title}</p>
                        <p className="text-[11px] text-gray-400">{session._count.messages} pesan · {formatRelativeTime(session.updatedAt)}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {sessions.filter((s) => s._count.messages > 0).length === 0 && (
                    <p className="text-center text-gray-400 text-xs py-8">Belum ada riwayat chat</p>
                  )}
                </div>
              </div>
            )}

            {/* Chat View */}
            {view === "chat" && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                  {messages.length === 0 && !streamingContent && (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Bot className="w-6 h-6 text-indigo-600" />
                      </div>
                      <h4 className="font-semibold text-gray-700 text-sm mb-1">Halo! Saya AI Assistant</h4>
                      <p className="text-xs text-gray-500 mb-4">Tanyakan apa saja tentang bisnis Anda</p>
                      <div className="grid grid-cols-2 gap-2">
                        {QUICK_PROMPTS.map((qp, i) => (
                          <button
                            key={i}
                            onClick={() => sendMessage(qp.prompt)}
                            className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition text-left text-xs group"
                          >
                            <qp.icon className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition shrink-0" />
                            <span className="text-gray-700 leading-tight">{qp.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`flex items-end gap-2 ${msg.role === "user" ? "max-w-[85%]" : "max-w-[90%]"}`}>
                        {msg.role === "assistant" && (
                          <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 mb-0.5">
                            <Bot className="w-3.5 h-3.5 text-indigo-600" />
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-indigo-600 text-white rounded-br-md"
                              : "bg-white text-gray-700 border border-gray-200 rounded-bl-md shadow-sm"
                          }`}
                        >
                          {msg.role === "assistant" ? <MarkdownRenderer content={msg.content} /> : msg.content}
                        </div>
                        {msg.role === "user" && (
                          <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center shrink-0 mb-0.5">
                            <User className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {streamingContent && (
                    <div className="flex justify-start">
                      <div className="flex items-end gap-2 max-w-[90%]">
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 mb-0.5">
                          <Bot className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <div className="rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed bg-white text-gray-700 border border-gray-200 rounded-bl-md shadow-sm">
                          <MarkdownRenderer content={streamingContent} />
                          <span className="inline-block w-1.5 h-4 bg-indigo-500 rounded animate-pulse ml-0.5" />
                        </div>
                      </div>
                    </div>
                  )}

                  {isLoading && !streamingContent && (
                    <div className="flex justify-start">
                      <div className="flex items-end gap-2">
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                          <Bot className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <div className="bg-white rounded-2xl px-4 py-3 border border-gray-200 shadow-sm">
                          <div className="flex gap-1.5">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <div className="p-3 border-t border-gray-100 bg-white shrink-0">
                  <div className="flex gap-2 items-end">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ketik pesan..."
                      rows={1}
                      className="flex-1 resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 max-h-24 text-black placeholder-gray-400"
                      disabled={isLoading}
                    />
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim() || isLoading}
                      className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                    AI menganalisis data bisnis Anda secara real-time
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

