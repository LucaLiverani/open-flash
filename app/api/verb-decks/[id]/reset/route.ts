import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDB();

  const deck = await db
    .prepare("SELECT id FROM verb_decks WHERE id = ?")
    .bind(id)
    .first();

  if (!deck) {
    return NextResponse.json({ error: "Verb deck not found" }, { status: 404 });
  }

  // Reset verb study progress for all verbs in this deck
  await db
    .prepare(
      `UPDATE verb_study_progress SET
        interval = 0,
        repetitions = 0,
        ease_factor = 2.5,
        next_review = date('now')
      WHERE saved_verb_id IN (SELECT id FROM saved_verbs WHERE verb_deck_id = ?)`
    )
    .bind(id)
    .run();

  return NextResponse.json({ success: true });
}
