import { NextResponse } from "next/server";
import { getDB, type DeckWithCounts } from "@/lib/db";

export async function GET() {
  const db = await getDB();
  const { results } = await db
    .prepare(
      `SELECT d.*,
        COUNT(c.id) as card_count,
        COUNT(CASE WHEN c.next_review <= date('now') THEN 1 END) as due_count
      FROM decks d
      LEFT JOIN cards c ON c.deck_id = d.id
      GROUP BY d.id
      ORDER BY d.created_at DESC`
    )
    .all<DeckWithCounts>();

  return NextResponse.json(results);
}

export async function POST(request: Request) {
  const body = await request.json() as { name: string; emoji?: string; source_lang: string; target_lang: string };
  const { name, emoji, source_lang, target_lang } = body;

  if (!name || !source_lang || !target_lang) {
    return NextResponse.json(
      { error: "name, source_lang, and target_lang are required" },
      { status: 400 }
    );
  }

  const id = crypto.randomUUID();
  const db = await getDB();
  await db
    .prepare(
      "INSERT INTO decks (id, name, emoji, source_lang, target_lang) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(id, name, emoji || "📚", source_lang, target_lang)
    .run();

  const deck = await db
    .prepare("SELECT * FROM decks WHERE id = ?")
    .bind(id)
    .first();

  return NextResponse.json(deck, { status: 201 });
}
