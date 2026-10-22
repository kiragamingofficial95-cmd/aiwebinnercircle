"use client";

import { useState } from "react";
import { Video } from "@/data/videos";
import { ChevronDown, ChevronRight, PlayCircle, CheckCircle2, Search, BookOpen, TrendingUp, Zap } from "lucide-react";

interface SidebarProps {
  sections: { name: string; videos: Video[] }[];
  currentVideoId: string;
  onSelectVideo: (video: Video) => void;
  completed: Set<string>;
  version: string;
  onVersionChange: (v: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ sections, currentVideoId, onSelectVideo, completed, version, onVersionChange, mobileOpen = false, onMobileClose }: SidebarProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    sections.forEach(s => { init[s.name] = true; });
    return init;
  });
  const [query, setQuery] = useState("");

  const filtered = sections.map(s => ({
    name: s.name,
    videos: s.videos.filter(v =>
      v.version === version &&
      v.title.toLowerCase().includes(query.toLowerCase())
    )
  })).filter(s => s.videos.length > 0);

  const total = filtered.reduce((a, s) => a + s.videos.length, 0);
  const done = filtered.reduce((a, s) => a + s.videos.filter(v => completed.has(v.id)).length, 0);

  const handleSelect = (v: Video) => { onSelectVideo(v); onMobileClose?.(); };

  return (
    <>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={onMobileClose} />
      )}
      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-72 h-screen flex flex-col border-r border-white/10 bg-zinc-950/95 md:bg-zinc-950/80 backdrop-blur-xl transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">AI Web Design</h1>
            <p className="text-xs text-zinc-400">Inner Circle</p>
          </div>
        </div>
        <div className="flex gap-2">
          {["1.0", "2.0"].map(v => (
            <button
              key={v}
              onClick={() => onVersionChange(v)}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                version === v
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              Version {v}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-3 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search lessons..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-900 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
          />
        </div>
      </div>

      <div className="px-4 py-2 flex items-center justify-between text-xs text-zinc-400">
        <span>{done}/{total} completed</span>
        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{total ? Math.round(done/total*100) : 0}%</span>
      </div>
      <div className="px-4 pb-2">
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all" style={{ width: `${total ? (done/total)*100 : 0}%` }} />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {filtered.map(section => (
          <div key={section.name} className="mb-1">
            <button
              onClick={() => setOpenSections(s => ({ ...s, [section.name]: !s[section.name] }))}
              className="w-full flex items-center gap-2 px-2 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              {openSections[section.name] ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span className="flex-1 text-left truncate">{section.name}</span>
              <span className="text-xs text-zinc-500">{section.videos.length}</span>
            </button>
            {openSections[section.name] && (
              <ul className="mt-1 space-y-0.5">
                {section.videos.map(v => {
                  const active = v.id === currentVideoId;
                  const isDone = completed.has(v.id);
                  return (
                    <li key={v.id}>
                      <button
                        onClick={() => handleSelect(v)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-all text-left ${
                          active
                            ? "bg-indigo-500/20 text-white border border-indigo-500/30"
                            : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <PlayCircle className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}
                        <span className="truncate flex-1">{v.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </nav>
    </aside>
    </>
  );
}
