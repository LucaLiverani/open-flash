import { NextResponse } from "next/server";
import { getDB, type VerbDeck } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDB();
  const deck = await db
    .prepare("SELECT * FROM verb_decks WHERE id = ?")
    .bind(id)
    .first<VerbDeck>();

  if (!deck) {
    return NextResponse.json({ error: "Verb deck not found" }, { status: 404 });
  }

  return NextResponse.json(deck);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as {
    name?: string;
    emoji?: string;
    language?: string;
    translation_lang?: string;
  };
  const { name, emoji, language, translation_lang } = body;

  const db = await getDB();
  const existing = await db
    .prepare("SELECT * FROM verb_decks WHERE id = ?")
    .bind(id)
    .first<VerbDeck>();

  if (!existing) {
    return NextResponse.json({ error: "Verb deck not found" }, { status: 404 });
  }

  await db
    .prepare(
      "UPDATE verb_decks SET name = ?, emoji = ?, language = ?, translation_lang = ? WHERE id = ?"
    )
    .bind(
      name || existing.name,
      emoji || existing.emoji,
      language || existing.language,
      translation_lang || existing.translation_lang,
      id
    )
    .run();

  const updated = await db
    .prepare("SELECT * FROM verb_decks WHERE id = ?")
    .bind(id)
    .first<VerbDeck>();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDB();

  const existing = await db
    .prepare("SELECT * FROM verb_decks WHERE id = ?")
    .bind(id)
    .first<VerbDeck>();

  if (!existing) {
    return NextResponse.json({ error: "Verb deck not found" }, { status: 404 });
  }

  // Enable foreign keys and delete in a batch so cascade works
  await db.batch([
    db.prepare("PRAGMA foreign_keys = ON"),
    db.prepare("DELETE FROM verb_decks WHERE id = ?").bind(id),
  ]);

  return NextResponse.json({ success: true });
}
