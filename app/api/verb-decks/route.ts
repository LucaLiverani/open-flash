import { NextResponse } from "next/server";
import { getDB, type VerbDeckWithCounts } from "@/lib/db";

export async function GET() {
  const db = await getDB();
  const { results } = await db
    .prepare(
      `SELECT vd.*,
        COUNT(sv.id) as verb_count,
        COUNT(DISTINCT CASE
          WHEN vsp.id IS NULL OR vsp.next_review <= date('now') THEN sv.id
        END) as due_count
      FROM verb_decks vd
      LEFT JOIN saved_verbs sv ON sv.verb_deck_id = vd.id
      LEFT JOIN verb_study_progress vsp ON vsp.saved_verb_id = sv.id
      GROUP BY vd.id
      ORDER BY vd.created_at DESC`
    )
    .all<VerbDeckWithCounts>();

  return NextResponse.json(results);
}

export async function POST(request: Request) {
  const body = await request.json() as {
    name: string;
    emoji?: string;
    language: string;
    translation_lang: string;
  };
  const { name, emoji, language, translation_lang } = body;

  if (!name || !language || !translation_lang) {
    return NextResponse.json(
      { error: "name, language, and translation_lang are required" },
      { status: 400 }
    );
  }

  const id = crypto.randomUUID();
  const db = await getDB();
  await db
    .prepare(
      "INSERT INTO verb_decks (id, name, emoji, language, translation_lang) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(id, name, emoji || "📖", language, translation_lang)
    .run();

  const deck = await db
    .prepare("SELECT * FROM verb_decks WHERE id = ?")
    .bind(id)
    .first();

  return NextResponse.json(deck, { status: 201 });
}
