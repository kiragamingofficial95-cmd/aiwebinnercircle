import { NextRequest, NextResponse } from "next/server";
import https from "https";
import { transcripts } from "@/data/transcripts";
import { driveDocs } from "@/data/driveDocs";
import { videos } from "@/data/videos";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || "";
const OLLAMA_API_KEY_BACKUP = process.env.OLLAMA_API_KEY_BACKUP || process.env.OLLAMA_API_KEY_2 || "c0f8dc970d504902bf58547248fbf4d8.hRbLgdF9jh4PxWJAvhBfJBST";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "https://ollama.com/v1";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma4:31b";

const DEFAULT_PROVIDER = process.env.DEFAULT_PROVIDER || "ollama";

function httpGet(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
    }).on("error", reject);
  });
}

async function webSearch(query: string): Promise<string> {
  try {
    const q = encodeURIComponent(query.slice(0, 200));
    const j = await httpGet(`https://api.duckduckgo.com/?q=${q}&format=json&no_html=1&skip_disambig=1`);
    const parts: string[] = [];
    if (j.AbstractText) parts.push(`- ${j.Heading}: ${j.AbstractText} (${j.AbstractURL})`);
    if (Array.isArray(j.RelatedTopics)) {
      for (const t of j.RelatedTopics.slice(0, 6)) {
        if (t.Text) parts.push(`- ${t.Text}${t.FirstURL ? " (" + t.FirstURL + ")" : ""}`);
        if (Array.isArray(t.Topics)) for (const tt of t.Topics.slice(0, 3)) if (tt.Text) parts.push(`- ${tt.Text}`);
      }
    }
    return parts.slice(0, 8).join("\n");
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages || [];
    const context = body.context || "";
    const clientTranscripts = body.transcripts || "";
    const provider = body.provider || DEFAULT_PROVIDER;
    const files = Array.isArray(body.files) ? body.files : [];
    const lastUser = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";

    const outline = videos
      .map(v => `- [v${v.version}] ${v.section}: ${v.title}`)
      .join("\n");

    // Relevance-based selection so the 1.5M+ chars of transcripts are not
    // blindly truncated: score each source against the user's query and keep
    // the most relevant ones within the context budget.
    const queryTokens = lastUser
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w: string) => w.length > 2);

    const score = (text: string) => {
      if (!queryTokens.length) return 1;
      const low = text.toLowerCase();
      let s = 0;
      for (const t of queryTokens) {
        let idx = 0;
        while ((idx = low.indexOf(t, idx)) !== -1) { s++; idx += t.length; }
      }
      return s;
    };

    const sources: { label: string; text: string }[] = [];
    for (const t of transcripts) sources.push({ label: `### ${t.title}`, text: t.content });
    for (const d of driveDocs) sources.push({ label: `### [${d.folder}] ${d.name}`, text: d.content });
    if (clientTranscripts) sources.push({ label: "### Client transcripts (memory)", text: clientTranscripts });

    // sort by relevance desc (stable-ish: keep original order on ties by index)
    const ranked = sources
      .map((s, i) => ({ ...s, i, sc: score(s.label + " " + s.text) }))
      .sort((a, b) => b.sc - a.sc || a.i - b.i);

    const BUDGET = 100000;
    const picked: string[] = [];
    let used = 0;
    for (const r of ranked) {
      const chunk = `${r.label}\n${r.text}`;
      if (used + chunk.length > BUDGET) {
        // try to fit a truncated remainder if there's room
        const room = BUDGET - used;
        if (room > 500) {
          picked.push(chunk.slice(0, room));
          used = BUDGET;
        }
        break;
      }
      picked.push(chunk);
      used += chunk.length + 2;
    }
    const combined = picked.join("\n\n");

    const filesContext = files
      .map((f: any) => `### Uploaded file: ${f.name}\n${(f.content || "").slice(0, 20000)}`)
      .join("\n\n")
      .slice(0, 60000);

    const searchResults = await webSearch(lastUser);

    const thinking: string[] = [];
    thinking.push("Reviewed course outline and transcripts");
    if (files.length) thinking.push(`Loaded ${files.length} uploaded file(s) into memory`);
    if (searchResults) thinking.push("Searched the web for up-to-date info");
    thinking.push(`Generating answer with ${provider}`);

    const systemPrompt = `You are "Coach", a mentor and trainer for "AI Web Design Inner Circle" students. You speak like the course creator: direct, motivating, practical, no-nonsense, encouraging action. You train students on web design agency business, cold calling, client acquisition, service delivery, upselling, ads, mindset.

You have access to ALL course transcripts and the full course outline below, plus any uploaded files and web search results. ALWAYS scan and use these transcripts/files to answer. You are NOT limited to the provided files — if something isn't covered, use your own knowledge and the web search results. Be honest when unsure.

Format your answers with Markdown (bold, lists, headings) so they render nicely. Always put a blank line between paragraphs and before/after lists so the formatting renders with proper spacing. Use single line breaks within a paragraph only when needed.

When a user uploads a file, silently incorporate it into your understanding. Do NOT say "I've got it", "noted", "you got it", or acknowledge uploads explicitly. Just use the content.

COURSE OUTLINE (all lessons):
${outline}

${combined ? `COURSE TRANSCRIPTS & DOCUMENTS:\n${combined}` : "No transcripts loaded yet."}

${filesContext ? `UPLOADED FILES (memory):\n${filesContext}` : ""}

${searchResults ? `WEB SEARCH RESULTS:\n${searchResults}` : ""}

${context ? `CURRENT VIDEO CONTEXT: ${context}` : ""}

Be concise, friendly, and practical. Use bullet points when helpful. When reasoning, you may include a <think>...</think> block with your step-by-step thinking before the final answer.`;

    // Build ordered list of attempts: primary provider, then Ollama backup key(s),
    // then (if primary was Groq) Ollama as a cross-provider fallback.
    const attempts: { url: string; key: string; model: string; label: string }[] = [];
    const ollamaUrl = `${OLLAMA_BASE_URL.replace(/\/$/, "")}/chat/completions`;
    if (provider === "ollama") {
      if (OLLAMA_API_KEY) attempts.push({ url: ollamaUrl, key: OLLAMA_API_KEY, model: OLLAMA_MODEL, label: "ollama" });
      if (OLLAMA_API_KEY_BACKUP && OLLAMA_API_KEY_BACKUP !== OLLAMA_API_KEY) attempts.push({ url: ollamaUrl, key: OLLAMA_API_KEY_BACKUP, model: OLLAMA_MODEL, label: "ollama-backup" });
    } else {
      if (GROQ_API_KEY) attempts.push({ url: "https://api.groq.com/openai/v1/chat/completions", key: GROQ_API_KEY, model: GROQ_MODEL, label: "groq" });
      // fallback to Ollama (primary then backup key) if Groq is unavailable/rate-limited
      if (OLLAMA_API_KEY) attempts.push({ url: ollamaUrl, key: OLLAMA_API_KEY, model: OLLAMA_MODEL, label: "ollama" });
      if (OLLAMA_API_KEY_BACKUP && OLLAMA_API_KEY_BACKUP !== OLLAMA_API_KEY) attempts.push({ url: ollamaUrl, key: OLLAMA_API_KEY_BACKUP, model: OLLAMA_MODEL, label: "ollama-backup" });
    }

    if (attempts.length === 0) {
      return NextResponse.json({ reply: `${provider} API key not configured.`, thinking });
    }

    let lastError = "";
    let res: Response | null = null;
    let usedLabel = attempts[0].label;
    for (const a of attempts) {
      usedLabel = a.label;
      res = await fetch(a.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${a.key}`,
        },
        body: JSON.stringify({
          model: a.model,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });
      if (res.ok) break;
      const errText = await res.text();
      lastError = `${a.label} error: ${errText}`;
      // only fall through to next attempt on rate-limit / auth / server errors
      if (res.status !== 429 && res.status !== 401 && res.status !== 403 && res.status < 500) {
        return NextResponse.json({ error: lastError, thinking }, { status: res.status });
      }
    }

    if (!res || !res.ok) {
      return NextResponse.json({ error: lastError || "All providers failed", thinking }, { status: 500 });
    }

    const data = await res.json();
    let reply = data.choices?.[0]?.message?.content || "No response.";
    // extract thinking block
    const thinkMatch = reply.match(/<think>([\s\S]*?)<\/think>/i);
    let modelThinking: string | null = null;
    if (thinkMatch) {
      modelThinking = thinkMatch[1].trim();
      reply = reply.replace(/<think>[\s\S]*?<\/think>/i, "").trim();
    }

    return NextResponse.json({ reply, thinking, modelThinking });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
