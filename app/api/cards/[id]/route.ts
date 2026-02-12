import { NextResponse } from "next/server";
import { getDB, type Card } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDB();
  const card = await db
    .prepare("SELECT * FROM cards WHERE id = ?")
    .bind(id)
    .first<Card>();

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json(card);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as { word?: string; translation?: string; example_sentence?: string; emoji?: string };
  const { word, translation, example_sentence, emoji } = body;

  const db = await getDB();
  const existing = await db
    .prepare("SELECT * FROM cards WHERE id = ?")
    .bind(id)
    .first<Card>();

  if (!existing) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  await db
    .prepare(
      `UPDATE cards SET word = ?, translation = ?, example_sentence = ?, emoji = ? WHERE id = ?`
    )
    .bind(
      word || existing.word,
      translation || existing.translation,
      example_sentence !== undefined ? example_sentence : existing.example_sentence,
      emoji || existing.emoji,
      id
    )
    .run();

  const updated = await db
    .prepare("SELECT * FROM cards WHERE id = ?")
    .bind(id)
    .first<Card>();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDB();

  const existing = await db
    .prepare("SELECT * FROM cards WHERE id = ?")
    .bind(id)
    .first<Card>();

  if (!existing) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  await db.prepare("DELETE FROM cards WHERE id = ?").bind(id).run();

  return NextResponse.json({ success: true });
}
