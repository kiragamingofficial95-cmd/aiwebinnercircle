"use client";

import { useState } from "react";
import { X, Upload } from "lucide-react";

interface Props {
  onClose: () => void;
}

export function BulkTranscriptModal({ onClose }: Props) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");

  const handleImport = () => {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected object map videoId->transcript");
      const existing = JSON.parse(localStorage.getItem("ic_transcripts") || "{}");
      const merged = { ...existing, ...parsed };
      localStorage.setItem("ic_transcripts", JSON.stringify(merged));
      setMsg(`Imported ${Object.keys(parsed).length} transcripts.`);
    } catch (e: any) {
      setMsg("Error: " + (e?.message || "invalid JSON"));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-cyan-300" />
            <h3 className="text-sm font-semibold text-white">Bulk import transcripts</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 p-5 flex flex-col gap-3 overflow-hidden">
          <p className="text-xs text-zinc-500">
            Paste a JSON object mapping video id to transcript text, e.g. {`{"1": "transcript...", "2": "..."}`}.
          </p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder='{"1": "transcript text..."}'
            className="flex-1 w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 resize-none font-mono"
          />
          {msg && <p className="text-xs text-emerald-300">{msg}</p>}
        </div>
        <div className="px-5 py-4 border-t border-white/10 flex justify-end">
          <button onClick={handleImport} className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-400 transition-colors">
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
