import { NextResponse } from "next/server";
import { getDB, type Deck } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDB();
  const deck = await db
    .prepare("SELECT * FROM decks WHERE id = ?")
    .bind(id)
    .first<Deck>();

  if (!deck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  return NextResponse.json(deck);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as { name?: string; emoji?: string; source_lang?: string; target_lang?: string };
  const { name, emoji, source_lang, target_lang } = body;

  const db = await getDB();
  const existing = await db
    .prepare("SELECT * FROM decks WHERE id = ?")
    .bind(id)
    .first<Deck>();

  if (!existing) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  await db
    .prepare(
      "UPDATE decks SET name = ?, emoji = ?, source_lang = ?, target_lang = ? WHERE id = ?"
    )
    .bind(
      name || existing.name,
      emoji || existing.emoji,
      source_lang || existing.source_lang,
      target_lang || existing.target_lang,
      id
    )
    .run();

  const updated = await db
    .prepare("SELECT * FROM decks WHERE id = ?")
    .bind(id)
    .first<Deck>();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDB();

  const existing = await db
    .prepare("SELECT * FROM decks WHERE id = ?")
    .bind(id)
    .first<Deck>();

  if (!existing) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  // Enable foreign keys and delete in a batch so cascade works
  await db.batch([
    db.prepare("PRAGMA foreign_keys = ON"),
    db.prepare("DELETE FROM decks WHERE id = ?").bind(id),
  ]);

  return NextResponse.json({ success: true });
}
