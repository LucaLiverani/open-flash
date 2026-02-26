import { NextResponse } from "next/server";
import { translateSentence } from "@/lib/gemini";
import type { LanguageCode } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json() as { sentence: string; source_lang: string; target_lang: string };
  const { sentence, source_lang, target_lang } = body;

  if (!sentence || !source_lang || !target_lang) {
    return NextResponse.json(
      { error: "sentence, source_lang, and target_lang are required" },
      { status: 400 }
    );
  }

  try {
    const translation = await translateSentence(
      sentence,
      source_lang as LanguageCode,
      target_lang as LanguageCode
    );
    return NextResponse.json({ translation });
  } catch (error) {
    console.error("AI sentence translate error:", error);
    return NextResponse.json(
      { error: "Failed to translate sentence" },
      { status: 500 }
    );
  }
}
