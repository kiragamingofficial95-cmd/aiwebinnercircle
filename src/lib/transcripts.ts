export const TRANSCRIPTS_KEY = "ic_transcripts";

export function loadTranscripts(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(TRANSCRIPTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveTranscript(videoId: string, text: string) {
  if (typeof window === "undefined") return;
  const all = loadTranscripts();
  if (text.trim()) all[videoId] = text.trim();
  else delete all[videoId];
  localStorage.setItem(TRANSCRIPTS_KEY, JSON.stringify(all));
}

export function getAllTranscriptText(): string {
  const all = loadTranscripts();
  return Object.entries(all)
    .map(([id, text]) => `### Video ${id}\n${text}`)
    .join("\n\n");
}
