import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

const COL = "transcripts";

export async function GET() {
  try {
    const db = await getDb();
    const docs = await db.collection(COL).find({}).toArray();
    const map: Record<string, string> = {};
    for (const d of docs) {
      if (d.videoId) map[d.videoId] = d.text || "";
    }
    return NextResponse.json({ transcripts: map });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "db error", transcripts: {} }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const videoId = body.videoId;
    const text = (body.text || "").trim();
    if (!videoId) return NextResponse.json({ error: "videoId required" }, { status: 400 });

    const db = await getDb();
    const col = db.collection(COL);
    if (text) {
      await col.updateOne({ videoId }, { $set: { videoId, text } }, { upsert: true });
    } else {
      await col.deleteOne({ videoId });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "db error" }, { status: 500 });
  }
}