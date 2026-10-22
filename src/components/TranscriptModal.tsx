"use client";

import { useState, useEffect } from "react";
import { X, FileText, Save } from "lucide-react";
import { loadTranscripts, saveTranscript } from "@/lib/transcripts";

interface Props {
  videoId: string;
  videoTitle: string;
  onClose: () => void;
}

export function TranscriptModal({ videoId, videoTitle, onClose }: Props) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const all = await loadTranscripts();
      setText(all[videoId] || "");
    })();
  }, [videoId]);

  const handleSave = async () => {
    await saveTranscript(videoId, text);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-300" />
            <div>
              <h3 className="text-sm font-semibold text-white">Transcript</h3>
              <p className="text-xs text-zinc-400 truncate max-w-md">{videoTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 p-5 overflow-hidden flex flex-col gap-3">
          <p className="text-xs text-zinc-500">
            Paste the transcript for this lesson. It will be saved locally and fed to the AI assistant.
          </p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste transcript here..."
            className="flex-1 w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 resize-none"
          />
        </div>
        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-zinc-500">{text.length} chars</span>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-400 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saved ? "Saved!" : "Save transcript"}
          </button>
        </div>
      </div>
    </div>
  );
}
