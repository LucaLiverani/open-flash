import { NextResponse } from "next/server";
import { getDB, type SavedVerb, toLanguageCode } from "@/lib/db";
import type { ConjugationResult } from "@/lib/gemini";

export async function POST(request: Request) {
  const body = await request.json() as {
    conjugation: ConjugationResult;
    language?: string;
    verb_deck_id?: string;
  };
  const { conjugation, verb_deck_id } = body;

  if (!conjugation?.infinitive || !conjugation?.language) {
    return NextResponse.json(
      { error: "conjugation with infinitive and language is required" },
      { status: 400 }
    );
  }

  // Use the language code from the client if provided, otherwise resolve from Gemini's string
  const langCode = body.language ?? toLanguageCode(conjugation.language) ?? conjugation.language;

  const db = await getDB();

  // Check for existing (idempotent)
  const existing = await db
    .prepare(
      "SELECT * FROM saved_verbs WHERE language = ? AND infinitive = ?"
    )
    .bind(langCode, conjugation.infinitive.toLowerCase())
    .first<SavedVerb>();

  if (existing) {
    // If verb exists but has no deck and we're providing one, update it
    if (verb_deck_id && !existing.verb_deck_id) {
      await db
        .prepare("UPDATE saved_verbs SET verb_deck_id = ? WHERE id = ?")
        .bind(verb_deck_id, existing.id)
        .run();
      return NextResponse.json({ ...existing, verb_deck_id });
    }
    return NextResponse.json(existing);
  }

  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO saved_verbs (id, language, infinitive, meaning, conjugations, verb_deck_id) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(
      id,
      langCode,
      conjugation.infinitive.toLowerCase(),
      conjugation.meaning,
      JSON.stringify(conjugation),
      verb_deck_id || null
    )
    .run();

  const saved = await db
    .prepare("SELECT * FROM saved_verbs WHERE id = ?")
    .bind(id)
    .first<SavedVerb>();

  return NextResponse.json(saved, { status: 201 });
}
