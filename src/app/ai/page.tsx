"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Plus, Trash2, Bot, Loader2, MessageSquare, Sparkles, Settings } from "lucide-react";
import { Conversation, ChatMessage, loadConversations, saveConversations, newConversation } from "@/lib/chatHistory";
import { getAllTranscriptText } from "@/lib/transcripts";

export default function AIPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState("ollama");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = loadConversations();
    setConversations(list);
    if (list.length) setCurrentId(list[0].id);
    else {
      const c = newConversation();
      saveConversations([c]);
      setConversations([c]);
      setCurrentId(c.id);
    }
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

  const send = async () => {
    const text = input.trim();
    if (!text || loading || !current) return;
    const updatedMsgs: ChatMessage[] = [...current.messages, { role: "user", content: text }];
    const updatedConv: Conversation = {
      ...current,
      messages: updatedMsgs,
      title: current.messages.length === 0 ? text.slice(0, 40) : current.title,
      updatedAt: Date.now(),
    };
    const list = conversations.map(c => (c.id === current.id ? updatedConv : c));
    persist(list);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMsgs,
          transcripts: getAllTranscriptText(),
          provider,
        }),
      });
      const data = await res.json();
      const reply = data.reply || data.error || "Something went wrong.";
      const finalConv: Conversation = {
        ...updatedConv,
        messages: [...updatedMsgs, { role: "assistant", content: reply }],
        updatedAt: Date.now(),
      };
      const finalList = conversations.map(c => (c.id === current.id ? finalConv : c));
      // ensure order: updated first
      const reordered = [finalConv, ...finalList.filter(c => c.id !== current.id)];
      persist(reordered);
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

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-72 shrink-0 h-screen flex flex-col border-r border-white/10 bg-zinc-950/80 backdrop-blur-xl">
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
            <option value="groq">Groq (Llama 3.3)</option>
          </select>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map(c => (
            <div
              key={c.id}
              onClick={() => setCurrentId(c.id)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                c.id === currentId ? "bg-indigo-500/20 text-white border border-indigo-500/30" : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate flex-1 text-xs">{c.title}</span>
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

      {/* Chat area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="px-6 py-4 border-b border-white/10 bg-zinc-950/70 backdrop-blur-xl flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{current?.title || "Chat"}</h2>
            <p className="text-xs text-zinc-500">Provider: {provider}</p>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 max-w-3xl mx-auto w-full">
          {current?.messages.length === 0 && (
            <div className="text-center text-zinc-500 text-sm mt-20">
              <Bot className="w-10 h-10 mx-auto mb-3 text-cyan-300" />
              Start a conversation. I have access to all course transcripts.
            </div>
          )}
          {current?.messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                m.role === "user" ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-100 border border-white/5"
              }`}>
                {m.role === "assistant" && <Bot className="inline w-3.5 h-3.5 mr-1 text-cyan-300" />}
                {m.content}
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

        <div className="p-4 border-t border-white/10 bg-zinc-950/70">
          <form onSubmit={e => { e.preventDefault(); send(); }} className="max-w-3xl mx-auto flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything about the course..."
              className="flex-1 px-4 py-3 text-sm bg-zinc-900 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
            />
            <button type="submit" disabled={loading || !input.trim()} className="px-4 py-3 rounded-xl bg-indigo-500 text-white disabled:opacity-50 hover:bg-indigo-400 transition-colors">
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
