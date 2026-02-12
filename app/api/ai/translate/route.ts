import { NextResponse } from "next/server";
import { translateWord } from "@/lib/gemini";
import type { LanguageCode } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json() as { word: string; source_lang: string; target_lang: string };
  const { word, source_lang, target_lang } = body;

  if (!word || !source_lang || !target_lang) {
    return NextResponse.json(
      { error: "word, source_lang, and target_lang are required" },
      { status: 400 }
    );
  }

  try {
    const result = await translateWord(
      word,
      source_lang as LanguageCode,
      target_lang as LanguageCode
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("AI translate error:", error);
    return NextResponse.json(
      { error: "Failed to translate word" },
      { status: 500 }
    );
  }
}
