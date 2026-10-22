"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X, Bot, Loader2, MessageSquare, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function Chatbot({ context }: { context?: string }) {
  const getProvider = () => (typeof window !== "undefined" ? (localStorage.getItem("ic_provider") || "ollama") : "ollama");
  const getTranscripts = () => {
    if (typeof window === "undefined") return "";
    try {
      const raw = localStorage.getItem("ic_transcripts");
      if (!raw) return "";
      const all = JSON.parse(raw) as Record<string, string>;
      return Object.entries(all).map(([id, t]) => `### Video ${id}\n${t}`).join("\n\n").slice(0, 80000);
    } catch { return ""; }
  };
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your AI Inner Circle assistant. Ask me anything about the lessons, strategies, or your agency. I have access to all video transcripts." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context, transcripts: getTranscripts(), provider: getProvider() }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: "assistant", content: data.reply || data.error || "Something went wrong." }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Network error." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-xl shadow-indigo-500/40 flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open chat"
      >
        {open ? <X className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6 text-white" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[560px] max-h-[calc(100vh-8rem)] flex flex-col rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-indigo-500/20 to-cyan-400/20">
            <Sparkles className="w-5 h-5 text-cyan-300" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
              <p className="text-xs text-zinc-400">Powered by Groq</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-indigo-500 text-white"
                    : "bg-zinc-800 text-zinc-100 border border-white/5"
                }`}>
                  {m.role === "assistant" && <Bot className="inline w-3.5 h-3.5 mr-1 text-cyan-300" />}
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 px-3 py-2 rounded-xl flex items-center gap-2 text-sm text-zinc-300">
                  <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-white/10">
            <form onSubmit={e => { e.preventDefault(); send(); }} className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about a lesson..."
                className="flex-1 px-3 py-2 text-sm bg-zinc-900 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
              />
              <button type="submit" disabled={loading || !input.trim()} className="px-3 py-2 rounded-lg bg-indigo-500 text-white disabled:opacity-50 hover:bg-indigo-400 transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
