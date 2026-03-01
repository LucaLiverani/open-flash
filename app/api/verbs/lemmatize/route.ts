import { NextResponse } from "next/server";
import { lemmatizeVerb } from "@/lib/gemini";

export async function POST(request: Request) {
  const body = await request.json() as { word: string; language: string };
  const { word, language } = body;

  if (!word || !language) {
    return NextResponse.json(
      { error: "word and language are required" },
      { status: 400 }
    );
  }

  try {
    const result = await lemmatizeVerb(word, language);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Lemmatize error:", error);
    return NextResponse.json(
      { error: "Failed to lemmatize verb" },
      { status: 500 }
    );
  }
}
