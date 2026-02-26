import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { text, source, target } = (await request.json()) as {
    text: string;
    source: string;
    target: string;
  };

  if (!text || !source || !target) {
    return NextResponse.json(
      { error: "text, source, and target are required" },
      { status: 400 }
    );
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google Translate error: ${res.status}`);

    const data = (await res.json()) as [string, string][][];
    const translation = (data[0] as [string, string][])
      .map((seg: [string, string]) => seg[0])
      .join("");

    return NextResponse.json({ translation });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Translate error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
