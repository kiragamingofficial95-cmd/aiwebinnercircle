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

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return list.map((c: any) => ({ ...c, files: c.files || [] }));
  } catch {
    return [];
  }
}

export function saveConversations(list: Conversation[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function newConversation(): Conversation {
  const now = Date.now();
  return { id: String(now), title: "New chat", messages: [], files: [], createdAt: now, updatedAt: now };
}
