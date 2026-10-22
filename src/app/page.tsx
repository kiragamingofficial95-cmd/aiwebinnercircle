"use client";

import { useState, useMemo, useEffect } from "react";
import { videos, getSections } from "@/data/videos";
import { Sidebar } from "@/components/Sidebar";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Chatbot } from "@/components/Chatbot";
import { PlayCircle, CheckCircle2, Clock, BookOpen, Sparkles, FileText } from "lucide-react";
import { TranscriptModal } from "@/components/TranscriptModal";
import { BulkTranscriptModal } from "@/components/BulkTranscriptModal";

export default function Home() {
  const sections = useMemo(() => getSections(), []);
  const [version, setVersion] = useState("2.0");
  const [current, setCurrent] = useState(videos.find(v => v.version === "2.0")!);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [showTranscript, setShowTranscript] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("completed");
      if (saved) setCompleted(new Set(JSON.parse(saved)));
      const v = localStorage.getItem("version");
      if (v) setVersion(v);
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("completed", JSON.stringify([...completed])); } catch {}
  }, [completed]);

  useEffect(() => {
    try { localStorage.setItem("version", version); } catch {}
    const first = videos.find(v => v.version === version);
    if (first && current.version !== version) setCurrent(first);
  }, [version]);

  const toggleComplete = (id: string) => {
    setCompleted(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const versionVideos = videos.filter(v => v.version === version);
  const currentIndex = versionVideos.findIndex(v => v.id === current.id);
  const prev = currentIndex > 0 ? versionVideos[currentIndex - 1] : null;
  const next = currentIndex < versionVideos.length - 1 ? versionVideos[currentIndex + 1] : null;

  return (
    <div className="flex min-h-screen pt-0">
      <Sidebar
        sections={sections}
        currentVideoId={current.id}
        onSelectVideo={setCurrent}
        completed={completed}
        version={version}
        onVersionChange={setVersion}
      />

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-zinc-950/70 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs text-zinc-500 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              {current.section} · Version {current.version}
            </p>
            <h2 className="text-lg font-semibold text-white truncate">{current.title}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              onClick={() => setShowTranscript(true)}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 border border-white/10 hover:bg-zinc-700 transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Transcript
            </button>
            <button
              onClick={() => setShowBulk(true)}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 border border-white/10 hover:bg-zinc-700 transition-colors flex items-center gap-2"
              title="Bulk import transcripts JSON"
            >
              <FileText className="w-4 h-4" />
              Import
            </button>
            <button
              onClick={() => toggleComplete(current.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                completed.has(current.id)
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-zinc-800 text-zinc-300 border border-white/10 hover:bg-zinc-700"
              }`}
            >
              {completed.has(current.id) ? <CheckCircle2 className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
              {completed.has(current.id) ? "Completed" : "Mark complete"}
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 space-y-6 max-w-5xl mx-auto w-full">
          <VideoPlayer video={current} />

          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => prev && setCurrent(prev)}
              disabled={!prev}
              className="px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-sm text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 transition-colors"
            >
              ← Previous
            </button>
            <div className="text-xs text-zinc-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Lesson {currentIndex + 1} of {versionVideos.length}
            </div>
            <button
              onClick={() => next && setCurrent(next)}
              disabled={!next}
              className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm disabled:opacity-30 hover:bg-indigo-400 transition-colors"
            >
              Next →
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-cyan-300" />
              <h3 className="font-semibold text-white">About this lesson</h3>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {current.title} — part of the <span className="text-indigo-300">{current.section}</span> section in Version {current.version}.
              Use the AI assistant (bottom right) to ask questions about this lesson or any topic covered in the course.
            </p>
          </div>
        </div>
      </main>

      {showTranscript && (
        <TranscriptModal videoId={current.id} videoTitle={current.title} onClose={() => setShowTranscript(false)} />
      )}
      {showBulk && <BulkTranscriptModal onClose={() => setShowBulk(false)} />}
      <Chatbot context={`${current.title} (${current.section}, v${current.version})`} />
    </div>
  );
}
