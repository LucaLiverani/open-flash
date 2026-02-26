import { NextResponse } from "next/server";
import { getDB, type SavedVerb } from "@/lib/db";
import { generateVerbExercise, type ConjugationResult } from "@/lib/gemini";

export async function POST(request: Request) {
  const body = await request.json() as { saved_verb_id: string; tense: string; translation_lang?: string };
  const { saved_verb_id, tense, translation_lang } = body;

  if (!saved_verb_id || !tense) {
    return NextResponse.json(
      { error: "saved_verb_id and tense are required" },
      { status: 400 }
    );
  }

  const db = await getDB();
  const verb = await db
    .prepare("SELECT * FROM saved_verbs WHERE id = ?")
    .bind(saved_verb_id)
    .first<SavedVerb>();

  if (!verb) {
    return NextResponse.json({ error: "Verb not found" }, { status: 404 });
  }

  const conjugations = JSON.parse(verb.conjugations) as ConjugationResult;
  const tenseData = conjugations.tenses.find((t) => t.tense === tense);

  if (!tenseData || tenseData.forms.length === 0) {
    return NextResponse.json(
      { error: "Tense not found for this verb" },
      { status: 404 }
    );
  }

  // Pick a random person/conjugation
  const randomForm = tenseData.forms[Math.floor(Math.random() * tenseData.forms.length)];

  const exercise = await generateVerbExercise(
    verb.infinitive,
    verb.language,
    tense,
    randomForm.person,
    randomForm.conjugation,
    verb.meaning,
    translation_lang
  );

  return NextResponse.json({
    ...exercise,
    saved_verb_id: verb.id,
    infinitive: verb.infinitive,
    meaning: verb.meaning,
    tense,
  });
}
