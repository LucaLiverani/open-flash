import { NextResponse } from "next/server";
import { getDB, type LanguageTensePrefs } from "@/lib/db";
import { getLanguageTenses } from "@/lib/gemini";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language");

  if (!language) {
    return NextResponse.json(
      { error: "language query parameter is required" },
      { status: 400 }
    );
  }

  const db = await getDB();
  let prefs = await db
    .prepare("SELECT * FROM language_tense_prefs WHERE language = ?")
    .bind(language)
    .first<LanguageTensePrefs>();

  if (!prefs) {
    const tenses = await getLanguageTenses(language);
    const allTensesJson = JSON.stringify(tenses);

    await db
      .prepare(
        "INSERT INTO language_tense_prefs (language, all_tenses, selected_tenses) VALUES (?, ?, ?)"
      )
      .bind(language, allTensesJson, allTensesJson)
      .run();

    prefs = await db
      .prepare("SELECT * FROM language_tense_prefs WHERE language = ?")
      .bind(language)
      .first<LanguageTensePrefs>();
  }

  return NextResponse.json({
    language: prefs!.language,
    all_tenses: JSON.parse(prefs!.all_tenses),
    selected_tenses: JSON.parse(prefs!.selected_tenses),
  });
}

export async function PUT(request: Request) {
  const body = await request.json() as { language: string; selected_tenses: string[] };
  const { language, selected_tenses } = body;

  if (!language || !selected_tenses) {
    return NextResponse.json(
      { error: "language and selected_tenses are required" },
      { status: 400 }
    );
  }

  const db = await getDB();
  await db
    .prepare(
      "UPDATE language_tense_prefs SET selected_tenses = ? WHERE language = ?"
    )
    .bind(JSON.stringify(selected_tenses), language)
    .run();

  return NextResponse.json({ language, selected_tenses });
}
