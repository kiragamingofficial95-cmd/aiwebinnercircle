export interface ChatFile {
  name: string;
  content: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  files?: ChatFile[];
  thinking?: string[];
  modelThinking?: string | null;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  files: ChatFile[];
  createdAt: number;
  updatedAt: number;
}

const KEY = "ic_conversations";

export function loadConversationsCache(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return list.map((c: any) => ({ ...c, files: c.files || [] }));
  } catch {
    return [];
  }
}

export function saveConversationsCache(list: Conversation[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

export async function loadConversations(): Promise<Conversation[]> {
  if (typeof window === "undefined") return [];
  try {
    const res = await fetch("/api/conversations");
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    const list = (data.conversations || []).map((c: any) => ({ ...c, files: c.files || [] }));
    saveConversationsCache(list);
    return list;
  } catch {
    return loadConversationsCache();
  }
}

export async function saveConversations(list: Conversation[]): Promise<void> {
  if (typeof window === "undefined") return;
  saveConversationsCache(list);
  try {
    await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversations: list }),
    });
  } catch {
    // cache kept; retry later
  }
}

export function newConversation(): Conversation {
  const now = Date.now();
  return { id: String(now), title: "New chat", messages: [], files: [], createdAt: now, updatedAt: now };
}