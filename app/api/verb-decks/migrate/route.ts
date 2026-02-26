import { NextResponse } from "next/server";
import { getDB, LANGUAGES, type LanguageCode } from "@/lib/db";

// One-time data migration: assign orphaned saved_verbs to default verb decks
export async function POST() {
  const db = await getDB();

  // Find distinct languages that have orphaned verbs (no verb_deck_id)
  const { results: orphanedLangs } = await db
    .prepare(
      "SELECT DISTINCT language FROM saved_verbs WHERE verb_deck_id IS NULL"
    )
    .all<{ language: string }>();

  if (orphanedLangs.length === 0) {
    return NextResponse.json({ message: "No orphaned verbs to migrate", created: 0 });
  }

  let created = 0;

  for (const { language } of orphanedLangs) {
    const langName = LANGUAGES[language as LanguageCode] ?? language;
    const deckName = `${langName} Verbs`;
    const id = crypto.randomUUID();

    // Default translation_lang to English, or Italian if the verb language is English
    const translationLang = language === "en" ? "it" : "en";

    await db
      .prepare(
        "INSERT INTO verb_decks (id, name, emoji, language, translation_lang) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(id, deckName, "📖", language, translationLang)
      .run();

    await db
      .prepare(
        "UPDATE saved_verbs SET verb_deck_id = ? WHERE language = ? AND verb_deck_id IS NULL"
      )
      .bind(id, language)
      .run();

    created++;
  }

  return NextResponse.json({ message: `Migrated ${created} language(s) to verb decks`, created });
}
