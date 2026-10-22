import { NextRequest, NextResponse } from "next/server";
import { transcripts } from "@/data/transcripts";
import { videos } from "@/data/videos";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || "";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "https://ollama.com/v1";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma4:31b";

const DEFAULT_PROVIDER = process.env.DEFAULT_PROVIDER || "ollama";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages || [];
    const context = body.context || "";
    const clientTranscripts = body.transcripts || "";
    const provider = body.provider || DEFAULT_PROVIDER;

    const transcriptContext = transcripts
      .map(t => `### ${t.title}\n${t.content}`)
      .join("\n\n")
      .slice(0, 60000);

    const outline = videos
      .map(v => `- [v${v.version}] ${v.section}: ${v.title}`)
      .join("\n");

    const combined = [transcriptContext, clientTranscripts].filter(Boolean).join("\n\n").slice(0, 100000);

    const systemPrompt = `You are an AI assistant for "AI Web Design Inner Circle" students. You help with doubts about the course videos, web design agency business, cold calling, client acquisition, service delivery, upselling, etc.

You have access to the transcripts of course videos below (when provided). Use them to answer accurately. If a question isn't covered, say so honestly and give general helpful guidance.

COURSE OUTLINE (all lessons):
${outline}

${combined ? `VIDEO TRANSCRIPTS:\n${combined}` : "No transcripts loaded yet. Users can add them via the Transcript button."}

${context ? `CURRENT VIDEO CONTEXT: ${context}` : ""}

Be concise, friendly, and practical. Use bullet points when helpful.`;

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
      return NextResponse.json({ reply: `${provider} API key not configured.` });
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
      return NextResponse.json({ error: `${provider} error: ${err}` }, { status: 500 });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "No response.";
    return NextResponse.json({ reply });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
