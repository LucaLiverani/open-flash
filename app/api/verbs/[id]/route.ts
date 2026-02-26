import { NextResponse } from "next/server";
import { getDB, type SavedVerb, type VerbDeck } from "@/lib/db";
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
  const { tenses, editedTenses, meaning } = (await request.json()) as {
    tenses?: string[];
    editedTenses?: ConjugationTense[];
    meaning?: string;
  };

  if ((!tenses || tenses.length === 0) && meaning === undefined) {
    return NextResponse.json(
      { error: "At least one of tenses or meaning is required" },
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
  let merged = { ...existing };

  // Update meaning if provided
  const newMeaning = meaning !== undefined ? meaning.trim() : undefined;
  if (newMeaning !== undefined) {
    merged.meaning = newMeaning;
  }

  // Update tenses if provided
  if (tenses && tenses.length > 0) {
    const baseTenses = editedTenses ?? existing.tenses;
    const baseTenseNames = new Set(baseTenses.map((t) => t.tense));
    const newTenseNames = tenses.filter((t) => !baseTenseNames.has(t));

    merged.tenses = baseTenses;
    if (newTenseNames.length > 0) {
      let targetLang: string | undefined;
      if (verb.verb_deck_id) {
        const deck = await db
          .prepare("SELECT * FROM verb_decks WHERE id = ?")
          .bind(verb.verb_deck_id)
          .first<VerbDeck>();
        targetLang = deck?.translation_lang;
      }
      const result = await conjugateVerb(verb.infinitive, verb.language, newTenseNames, targetLang);
      merged.tenses = [...baseTenses, ...result.tenses];
    }

    // Remove tenses that are no longer selected
    const selectedSet = new Set(tenses);
    merged.tenses = merged.tenses.filter((t) => selectedSet.has(t.tense));
  } else if (editedTenses) {
    merged.tenses = editedTenses;
  }

  const updates: string[] = [];
  const bindings: unknown[] = [];

  updates.push("conjugations = ?");
  bindings.push(JSON.stringify(merged));

  if (newMeaning !== undefined) {
    updates.push("meaning = ?");
    bindings.push(newMeaning);
  }

  bindings.push(id);
  await db
    .prepare(`UPDATE saved_verbs SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...bindings)
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
