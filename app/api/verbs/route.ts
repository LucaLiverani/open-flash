import { NextResponse } from "next/server";
import { getDB, type SavedVerb } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language");
  const verbDeckId = searchParams.get("verb_deck_id");

  if (!language && !verbDeckId) {
    return NextResponse.json(
      { error: "language or verb_deck_id query parameter is required" },
      { status: 400 }
    );
  }

  const db = await getDB();

  if (verbDeckId) {
    const { results } = await db
      .prepare(
        "SELECT * FROM saved_verbs WHERE verb_deck_id = ? ORDER BY created_at DESC"
      )
      .bind(verbDeckId)
      .all<SavedVerb>();
    return NextResponse.json(results);
  }

  const { results } = await db
    .prepare(
      "SELECT * FROM saved_verbs WHERE language = ? ORDER BY created_at DESC"
    )
    .bind(language)
    .all<SavedVerb>();

  return NextResponse.json(results);
}
