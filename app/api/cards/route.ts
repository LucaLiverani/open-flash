import { NextResponse } from "next/server";
import { getDB, type Card } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deckId = searchParams.get("deck_id");

  if (!deckId) {
    return NextResponse.json(
      { error: "deck_id query parameter is required" },
      { status: 400 }
    );
  }

  const db = await getDB();
  const { results } = await db
    .prepare("SELECT * FROM cards WHERE deck_id = ? ORDER BY created_at DESC")
    .bind(deckId)
    .all<Card>();

  return NextResponse.json(results);
}

export async function POST(request: Request) {
  const body = await request.json() as { deck_id: string; word: string; translation: string; example_sentence?: string; emoji?: string };
  const { deck_id, word, translation, example_sentence, emoji } = body;

  if (!deck_id || !word || !translation) {
    return NextResponse.json(
      { error: "deck_id, word, and translation are required" },
      { status: 400 }
    );
  }

  const id = crypto.randomUUID();
  const db = await getDB();
  await db
    .prepare(
      `INSERT INTO cards (id, deck_id, word, translation, example_sentence, emoji)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(id, deck_id, word, translation, example_sentence || null, emoji || "📝")
    .run();

  const card = await db
    .prepare("SELECT * FROM cards WHERE id = ?")
    .bind(id)
    .first<Card>();

  return NextResponse.json(card, { status: 201 });
}
