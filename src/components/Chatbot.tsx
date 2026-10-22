"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, X, Bot, Loader2, MessageSquare, Sparkles, Paperclip, ChevronDown, ChevronUp } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  files?: { name: string; content: string }[];
  thinking?: string[];
  modelThinking?: string | null;
}

export function Chatbot({ context }: { context?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm Coach. Ask me anything about the course, your agency, or upload a file for me to work with." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<{ name: string; content: string }[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

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

  const uploadFile = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/extract", { method: "POST", body: form });
    const data = await res.json();
    if (data.content) setFiles(f => [...f, { name: data.name, content: data.content }]);
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && files.length === 0) || loading) return;
    const next: Message[] = [...messages, { role: "user", content: text || "(file uploaded)", files: files.length ? [...files] : undefined }];
    setMessages(next);
    setInput("");
    const sendFiles = [...files];
    setFiles([]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })), context, transcripts: getTranscripts(), provider: getProvider(), files: sendFiles }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: "assistant", content: data.reply || data.error || "Something went wrong.", thinking: data.thinking, modelThinking: data.modelThinking }]);
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
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-xl shadow-indigo-500/40 flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open chat"
      >
        {open ? <X className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6 text-white" />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-3 sm:right-6 z-50 w-[calc(100vw-1.5rem)] sm:w-[400px] max-w-[400px] h-[70vh] sm:h-[600px] max-h-[calc(100vh-6rem)] flex flex-col rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-indigo-500/20 to-cyan-400/20">
            <Sparkles className="w-5 h-5 text-cyan-300" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white">Coach</h3>
              <p className="text-xs text-zinc-400">Powered by {getProvider()}</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] px-3 py-2 rounded-xl text-sm ${m.role === "user" ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-100 border border-white/5"}`}>
                  {m.role === "assistant" && <Bot className="inline w-3.5 h-3.5 mr-1 text-cyan-300" />}
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  {m.files && m.files.length > 0 && (
                    <div className="mt-1 text-xs text-indigo-200">📎 {m.files.map(f => f.name).join(", ")}</div>
                  )}
                  {m.role === "assistant" && (m.thinking || m.modelThinking) && (
                    <div className="mt-2 border-t border-white/10 pt-2">
                      <button
                        onClick={() => setExpanded(e => ({ ...e, [i]: !e[i] }))}
                        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200"
                      >
                        {expanded[i] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        Thinking
                      </button>
                      {expanded[i] && (
                        <div className="mt-1 text-xs text-zinc-400 whitespace-pre-wrap bg-zinc-900/60 rounded p-2">
                          {m.thinking && m.thinking.map((t, j) => <div key={j}>• {t}</div>)}
                          {m.modelThinking && <div className="mt-1 text-zinc-300">{m.modelThinking}</div>}
                        </div>
                      )}
                    </div>
                  )}
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

          {files.length > 0 && (
            <div className="px-3 py-2 border-t border-white/10 flex flex-wrap gap-1.5">
              {files.map((f, i) => (
                <span key={i} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md flex items-center gap-1">
                  📎 {f.name}
                  <button onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} className="text-zinc-500 hover:text-red-400">×</button>
                </span>
              ))}
            </div>
          )}

          <div className="p-3 border-t border-white/10">
            <form onSubmit={e => { e.preventDefault(); send(); }} className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                onChange={e => {
                  const fs = e.target.files;
                  if (fs) Array.from(fs).forEach(uploadFile);
                  e.target.value = "";
                }}
              />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="px-2 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700">
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask or attach a file..."
                className="flex-1 px-3 py-2 text-sm bg-zinc-900 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
              />
              <button type="submit" disabled={loading || (!input.trim() && files.length === 0)} className="px-3 py-2 rounded-lg bg-indigo-500 text-white disabled:opacity-50 hover:bg-indigo-400 transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
