"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Send, Plus, Trash2, Bot, Loader2, MessageSquare, Sparkles, Settings, Paperclip, ChevronDown, ChevronUp } from "lucide-react";
import { Conversation, ChatMessage, ChatFile, loadConversations, saveConversations, newConversation } from "@/lib/chatHistory";
import { getAllTranscriptText } from "@/lib/transcripts";

export default function AIPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState("ollama");
  const [files, setFiles] = useState<ChatFile[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const list = await loadConversations();
      setConversations(list);
      if (list.length) setCurrentId(list[0].id);
      else {
        const c = newConversation();
        await saveConversations([c]);
        setConversations([c]);
        setCurrentId(c.id);
      }
    })();
    const p = localStorage.getItem("ic_provider");
    if (p) setProvider(p);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [conversations, loading, currentId]);

  const current = conversations.find(c => c.id === currentId) || null;

  const persist = (list: Conversation[]) => {
    setConversations(list);
    saveConversations(list);
  };

  const createNew = () => {
    const c = newConversation();
    const list = [c, ...conversations];
    persist(list);
    setCurrentId(c.id);
    setFiles([]);
  };

  const deleteConv = (id: string) => {
    const list = conversations.filter(c => c.id !== id);
    persist(list);
    if (currentId === id) setCurrentId(list[0]?.id || null);
    if (!list.length) {
      const c = newConversation();
      persist([c]);
      setCurrentId(c.id);
    }
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
    if ((!text && files.length === 0) || loading || !current) return;
    const userMsg: ChatMessage = { role: "user", content: text || "(file uploaded)", files: files.length ? [...files] : undefined };
    const updatedMsgs: ChatMessage[] = [...current.messages, userMsg];
    // merge uploaded files into conversation memory
    const mergedFiles = [...current.files];
    for (const f of files) if (!mergedFiles.find(x => x.name === f.name)) mergedFiles.push(f);
    const updatedConv: Conversation = {
      ...current,
      messages: updatedMsgs,
      files: mergedFiles,
      title: current.messages.length === 0 ? (text || "File chat").slice(0, 40) : current.title,
      updatedAt: Date.now(),
    };
    const list = conversations.map(c => (c.id === current.id ? updatedConv : c));
    persist(list);
    setInput("");
    const sendFiles = [...files];
    setFiles([]);
    setLoading(true);
    try {
      const transcriptText = await getAllTranscriptText();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMsgs.map(m => ({ role: m.role, content: m.content })),
          transcripts: transcriptText,
          provider,
          files: [...mergedFiles, ...sendFiles],
        }),
      });
      const data = await res.json();
      const reply = data.reply || data.error || "Something went wrong.";
      const finalConv: Conversation = {
        ...updatedConv,
        messages: [...updatedMsgs, { role: "assistant", content: reply, thinking: data.thinking, modelThinking: data.modelThinking }],
        updatedAt: Date.now(),
      };
      const finalList = [finalConv, ...conversations.filter(c => c.id !== current.id)];
      persist(finalList);
    } catch {
      const finalConv: Conversation = {
        ...updatedConv,
        messages: [...updatedMsgs, { role: "assistant", content: "Network error." }],
        updatedAt: Date.now(),
      };
      persist([finalConv, ...conversations.filter(c => c.id !== current.id)]);
    } finally {
      setLoading(false);
    }
  };

  const changeProvider = (p: string) => {
    setProvider(p);
    localStorage.setItem("ic_provider", p);
  };

  const toggleExpand = (key: string) => setExpanded(e => ({ ...e, [key]: !e[key] }));

  return (
    <div className="flex h-screen">
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-72 h-screen flex flex-col border-r border-white/10 bg-zinc-950/95 md:bg-zinc-950/80 backdrop-blur-xl transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-300" />
            <h1 className="text-sm font-bold text-white">AI Chats</h1>
          </div>
          <button onClick={createNew} className="p-1.5 rounded-md bg-indigo-500 text-white hover:bg-indigo-400">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 py-3 border-b border-white/10">
          <label className="text-xs text-zinc-400 flex items-center gap-1.5 mb-1.5">
            <Settings className="w-3.5 h-3.5" /> Provider
          </label>
          <select
            value={provider}
            onChange={e => changeProvider(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-zinc-900 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500/50"
          >
            <option value="ollama">Ollama (gemma4:31b)</option>
            <option value="groq">Groq (gpt-oss-120b)</option>
          </select>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map(c => (
            <div
              key={c.id}
              onClick={() => { setCurrentId(c.id); setSidebarOpen(false); }}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                c.id === currentId ? "bg-indigo-500/20 text-white border border-indigo-500/30" : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate flex-1 text-xs">{c.title}</span>
              {c.files.length > 0 && <span className="text-[10px] text-zinc-500">📎{c.files.length}</span>}
              <button
                onClick={e => { e.stopPropagation(); deleteConv(c.id); }}
                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="px-3 sm:px-6 py-3 sm:py-4 border-b border-white/10 bg-zinc-950/70 backdrop-blur-xl flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg bg-zinc-800 text-zinc-300 border border-white/10"
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-lg font-semibold text-white truncate">{current?.title || "Chat"}</h2>
            <p className="text-xs text-zinc-500">Provider: {provider} · {current?.files.length || 0} file(s)</p>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 max-w-3xl mx-auto w-full">
          {current?.messages.length === 0 && (
            <div className="text-center text-zinc-500 text-sm mt-20">
              <Bot className="w-10 h-10 mx-auto mb-3 text-cyan-300" />
              Start a conversation. I have access to all course transcripts, uploaded files, and the web.
            </div>
          )}
          {current?.messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${m.role === "user" ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-100 border border-white/5"}`}>
                {m.role === "assistant" && <Bot className="inline w-3.5 h-3.5 mr-1 text-cyan-300" />}
                <div className="prose prose-invert prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{m.content}</ReactMarkdown></div>
                {m.files && m.files.length > 0 && (
                  <div className="mt-1 text-xs text-indigo-200">📎 {m.files.map(f => f.name).join(", ")}</div>
                )}
                {m.role === "assistant" && (m.thinking?.length || m.modelThinking) && (
                  <div className="mt-2 border-t border-white/10 pt-2">
                    <button
                      onClick={() => toggleExpand(`${current.id}-${i}`)}
                      className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      {expanded[`${current.id}-${i}`] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      Thinking
                    </button>
                    {expanded[`${current.id}-${i}`] && (
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
              <div className="bg-zinc-800 px-4 py-3 rounded-2xl flex items-center gap-2 text-sm text-zinc-300">
                <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
              </div>
            </div>
          )}
        </div>

        {files.length > 0 && (
          <div className="px-4 py-2 border-t border-white/10 flex flex-wrap gap-1.5 max-w-3xl mx-auto w-full">
            {files.map((f, i) => (
              <span key={i} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md flex items-center gap-1">
                📎 {f.name}
                <button onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} className="text-zinc-500 hover:text-red-400">×</button>
              </span>
            ))}
          </div>
        )}

        <div className="p-4 border-t border-white/10 bg-zinc-950/70">
          <form onSubmit={e => { e.preventDefault(); send(); }} className="max-w-3xl mx-auto flex gap-2">
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
            <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-3 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700">
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything or attach a file..."
              className="flex-1 px-4 py-3 text-sm bg-zinc-900 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
            />
            <button type="submit" disabled={loading || (!input.trim() && files.length === 0)} className="px-4 py-3 rounded-xl bg-indigo-500 text-white disabled:opacity-50 hover:bg-indigo-400 transition-colors">
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
