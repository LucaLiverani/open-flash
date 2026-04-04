import { NextResponse } from "next/server";
import { getDB, type TenseGrammar, type LanguageTensePrefs } from "@/lib/db";
import { generateTenseGrammar } from "@/lib/gemini";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language");
  const translationLang = searchParams.get("translation_lang") ?? "en";

  if (!language) {
    return NextResponse.json(
      { error: "language is required" },
      { status: 400 }
    );
  }

  const db = await getDB();

  // Get all tenses for this language
  const prefs = await db
    .prepare("SELECT * FROM language_tense_prefs WHERE language = ?")
    .bind(language)
    .first<LanguageTensePrefs>();

  if (!prefs) {
    return NextResponse.json({ grammar: [] });
  }

  const allTenses = JSON.parse(prefs.all_tenses) as string[];

  // Get cached grammar entries
  const { results: cached } = await db
    .prepare("SELECT * FROM tense_grammar WHERE language = ?")
    .bind(language)
    .all<TenseGrammar>();

  const cachedTenses = new Set(cached.map((g) => g.tense));
  const missingTenses = allTenses.filter((t) => !cachedTenses.has(t));

  // Generate missing grammar explanations
  if (missingTenses.length > 0) {
    const results = await generateTenseGrammar(language, missingTenses, translationLang);

    const stmts = results.map((r) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO tense_grammar (id, language, tense, explanation, when_to_use, examples, common_mistakes) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(
          crypto.randomUUID(),
          language,
          r.tense,
          r.explanation,
          r.whenToUse,
          JSON.stringify(r.examples),
          r.commonMistakes
        )
    );

    await db.batch(stmts);

    // Re-fetch all
    const { results: all } = await db
      .prepare("SELECT * FROM tense_grammar WHERE language = ?")
      .bind(language)
      .all<TenseGrammar>();

    return NextResponse.json({ grammar: all });
  }

  return NextResponse.json({ grammar: cached });
}
