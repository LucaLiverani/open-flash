import { NextResponse } from "next/server";
import { getDB, type SavedVerb } from "@/lib/db";
import { conjugateVerb, type ConjugationResult, type ConjugationTense } from "@/lib/gemini";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const db = await getDB();
  const verb = await db
    .prepare("SELECT * FROM saved_verbs WHERE id = ?")
    .bind(id)
    .first<SavedVerb>();

  if (!verb) {
    return NextResponse.json({ error: "Verb not found" }, { status: 404 });
  }

  return NextResponse.json(verb);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { tenses, editedTenses } = (await request.json()) as {
    tenses: string[];
    editedTenses?: ConjugationTense[];
  };

  if (!tenses || tenses.length === 0) {
    return NextResponse.json(
      { error: "tenses array is required" },
      { status: 400 }
    );
  }

  const db = await getDB();
  const verb = await db
    .prepare("SELECT * FROM saved_verbs WHERE id = ?")
    .bind(id)
    .first<SavedVerb>();

  if (!verb) {
    return NextResponse.json({ error: "Verb not found" }, { status: 404 });
  }

  const existing = JSON.parse(verb.conjugations) as ConjugationResult;
  const baseTenses = editedTenses ?? existing.tenses;
  const baseTenseNames = new Set(baseTenses.map((t) => t.tense));
  const newTenses = tenses.filter((t) => !baseTenseNames.has(t));

  let merged = { ...existing, tenses: baseTenses };
  if (newTenses.length > 0) {
    const result = await conjugateVerb(verb.infinitive, verb.language, newTenses);
    merged = {
      ...merged,
      tenses: [...baseTenses, ...result.tenses],
    };
  }

  // Remove tenses that are no longer selected
  const selectedSet = new Set(tenses);
  merged = {
    ...merged,
    tenses: merged.tenses.filter((t) => selectedSet.has(t.tense)),
  };

  await db
    .prepare("UPDATE saved_verbs SET conjugations = ? WHERE id = ?")
    .bind(JSON.stringify(merged), id)
    .run();

  const updated = await db
    .prepare("SELECT * FROM saved_verbs WHERE id = ?")
    .bind(id)
    .first<SavedVerb>();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const db = await getDB();
  const existing = await db
    .prepare("SELECT id FROM saved_verbs WHERE id = ?")
    .bind(id)
    .first();

  if (!existing) {
    return NextResponse.json({ error: "Verb not found" }, { status: 404 });
  }

  await db
    .prepare("DELETE FROM saved_verbs WHERE id = ?")
    .bind(id)
    .run();

  return NextResponse.json({ success: true });
}
