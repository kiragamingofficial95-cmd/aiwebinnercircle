import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

const COL = "conversations";

export async function GET() {
  try {
    const db = await getDb();
    const docs = await db.collection(COL).find({}).toArray();
    const list = docs.map(({ _id, ...rest }) => rest);
    return NextResponse.json({ conversations: list });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "db error", conversations: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const incoming: any[] = Array.isArray(body.conversations)
      ? body.conversations
      : body.conversation
      ? [body.conversation]
      : [];
    const db = await getDb();
    const col = db.collection(COL);

    // upsert each incoming conversation
    for (const c of incoming) {
      if (!c?.id) continue;
      await col.updateOne({ id: c.id }, { $set: c }, { upsert: true });
    }

    // remove conversations no longer present
    const ids = incoming.map(c => c.id).filter(Boolean);
    if (ids.length) {
      await col.deleteMany({ id: { $nin: ids } });
    } else {
      await col.deleteMany({});
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "db error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const db = await getDb();
    if (id) await db.collection(COL).deleteOne({ id });
    else await db.collection(COL).deleteMany({});
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "db error" }, { status: 500 });
  }
}