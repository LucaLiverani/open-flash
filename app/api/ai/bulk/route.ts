import { NextResponse } from "next/server";
import { generateBulkCards } from "@/lib/gemini";
import type { LanguageCode } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json() as { prompt: string; source_lang: string; target_lang: string; count?: number };
  const { prompt, source_lang, target_lang, count } = body;

  if (!prompt || !source_lang || !target_lang) {
    return NextResponse.json(
      { error: "prompt, source_lang, and target_lang are required" },
      { status: 400 }
    );
  }

  try {
    const results = await generateBulkCards(
      prompt,
      source_lang as LanguageCode,
      target_lang as LanguageCode,
      count || 10
    );
    return NextResponse.json(results);
  } catch (error) {
    console.error("AI bulk generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate cards" },
      { status: 500 }
    );
  }
}
