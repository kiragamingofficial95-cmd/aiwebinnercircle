import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const name = file.name;
    const buf = Buffer.from(await file.arrayBuffer());

    let content = "";
    if (name.toLowerCase().endsWith(".pdf")) {
      // @ts-ignore
      const pdfParse = (await import("pdf-parse")).default;
      const parsed = await pdfParse(buf);
      content = parsed.text || "";
    } else {
      content = buf.toString("utf8");
    }

    content = content.replace(/\s+\n/g, "\n").trim().slice(0, 40000);
    return NextResponse.json({ name, content, size: buf.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "extract failed" }, { status: 500 });
  }
}
