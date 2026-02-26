import { NextResponse } from "next/server";
import { getDB, type SavedVerb } from "@/lib/db";
import { conjugateVerb } from "@/lib/gemini";
import type { ConjugationResult } from "@/lib/gemini";

export async function POST(request: Request) {
  const body = await request.json() as { verb: string; language: string; tenses: string[]; targetLang?: string };
  const { verb, language, tenses, targetLang } = body;

  if (!verb || !language || !tenses?.length) {
    return NextResponse.json(
      { error: "verb, language, and tenses are required" },
      { status: 400 }
    );
  }

  const db = await getDB();

  // Check if verb is already saved (cache hit)
  const saved = await db
    .prepare(
      "SELECT * FROM saved_verbs WHERE language = ? AND infinitive = ?"
    )
    .bind(language, verb.toLowerCase().trim())
    .first<SavedVerb>();

  if (saved) {
    const conjugations = JSON.parse(saved.conjugations) as ConjugationResult;
    return NextResponse.json({
      ...conjugations,
      savedId: saved.id,
    });
  }

  try {
    const result = await conjugateVerb(verb, language, tenses, targetLang);

    // Check if the canonical infinitive is saved (e.g. user typed "mangio" but infinitive is "mangiare")
    if (result.isVerb && result.infinitive.toLowerCase() !== verb.toLowerCase().trim()) {
      const savedCanonical = await db
        .prepare(
          "SELECT * FROM saved_verbs WHERE language = ? AND infinitive = ?"
        )
        .bind(language, result.infinitive.toLowerCase())
        .first<SavedVerb>();

      if (savedCanonical) {
        return NextResponse.json({
          ...result,
          savedId: savedCanonical.id,
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Conjugation error:", error);
    return NextResponse.json(
      { error: "Failed to conjugate verb" },
      { status: 500 }
    );
  }
}
