import { NextRequest, NextResponse } from "next/server";
import https from "https";
import { transcripts } from "@/data/transcripts";
import { videos } from "@/data/videos";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || "";
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

    const transcriptContext = transcripts
      .map(t => `### ${t.title}\n${t.content}`)
      .join("\n\n")
      .slice(0, 60000);

    const outline = videos
      .map(v => `- [v${v.version}] ${v.section}: ${v.title}`)
      .join("\n");

    const combined = [transcriptContext, clientTranscripts].filter(Boolean).join("\n\n").slice(0, 100000);

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

Format your answers with Markdown (bold, lists, headings) so they render nicely.

When a user uploads a file, silently incorporate it into your understanding. Do NOT say "I've got it", "noted", "you got it", or acknowledge uploads explicitly. Just use the content.

COURSE OUTLINE (all lessons):
${outline}

${combined ? `VIDEO TRANSCRIPTS:\n${combined}` : "No transcripts loaded yet."}

${filesContext ? `UPLOADED FILES (memory):\n${filesContext}` : ""}

${searchResults ? `WEB SEARCH RESULTS:\n${searchResults}` : ""}

${context ? `CURRENT VIDEO CONTEXT: ${context}` : ""}

Be concise, friendly, and practical. Use bullet points when helpful. When reasoning, you may include a <think>...</think> block with your step-by-step thinking before the final answer.`;

    let url = "";
    let key = "";
    let model = "";
    if (provider === "ollama") {
      url = `${OLLAMA_BASE_URL.replace(/\/$/, "")}/chat/completions`;
      key = OLLAMA_API_KEY;
      model = OLLAMA_MODEL;
    } else {
      url = "https://api.groq.com/openai/v1/chat/completions";
      key = GROQ_API_KEY;
      model = GROQ_MODEL;
    }

    if (!key) {
      return NextResponse.json({ reply: `${provider} API key not configured.`, thinking });
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `${provider} error: ${err}`, thinking }, { status: 500 });
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
