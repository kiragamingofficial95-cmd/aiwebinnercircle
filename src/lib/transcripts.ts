export const TRANSCRIPTS_KEY = "ic_transcripts";

// localStorage helpers kept as offline fallback cache
export function loadTranscriptsCache(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(TRANSCRIPTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveTranscriptsCache(all: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TRANSCRIPTS_KEY, JSON.stringify(all));
  } catch {}
}

export async function loadTranscripts(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};
  try {
    const res = await fetch("/api/transcripts");
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    const map = (data.transcripts || {}) as Record<string, string>;
    saveTranscriptsCache(map);
    return map;
  } catch {
    return loadTranscriptsCache();
  }
}

export async function saveTranscript(videoId: string, text: string): Promise<void> {
  if (typeof window === "undefined") return;
  const all = loadTranscriptsCache();
  if (text.trim()) all[videoId] = text.trim();
  else delete all[videoId];
  saveTranscriptsCache(all);

  try {
    await fetch("/api/transcripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, text: text.trim() }),
    });
  } catch {
    // keep cache; will retry later
  }
}

export async function getAllTranscriptText(): Promise<string> {
  const all = await loadTranscripts();
  return Object.entries(all)
    .map(([id, text]) => `### Video ${id}\n${text}`)
    .join("\n\n");
}