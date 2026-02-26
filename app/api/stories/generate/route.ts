import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { generateStory } from "@/lib/gemini";
import type { LanguageCode } from "@/lib/db";

interface TopicRequest {
  language: LanguageCode;
  nativeLang: LanguageCode;
  topic: string;
  difficulty: "beginner" | "intermediate";
}

interface DeckRequest {
  deckId: string;
  difficulty: "beginner" | "intermediate";
}

type StoryRequest = TopicRequest | DeckRequest;

function isDeckRequest(body: StoryRequest): body is DeckRequest {
  return "deckId" in body;
}

export async function POST(request: Request) {
  const body = (await request.json()) as StoryRequest;

  try {
    if (isDeckRequest(body)) {
      const db = await getDB();

      const deck = await db
        .prepare("SELECT * FROM decks WHERE id = ?")
        .bind(body.deckId)
        .first<{ source_lang: string; target_lang: string; name: string }>();

      if (!deck) {
        return NextResponse.json({ error: "Deck not found" }, { status: 404 });
      }

      const { results: cards } = await db
        .prepare(
          "SELECT word FROM cards WHERE deck_id = ? ORDER BY ease_factor ASC LIMIT 10"
        )
        .bind(body.deckId)
        .all<{ word: string }>();

      const words = cards.map((c) => c.word);

      const story = await generateStory({
        language: deck.target_lang as LanguageCode,
        nativeLang: deck.source_lang as LanguageCode,
        topic: `a story using vocabulary from "${deck.name}"`,
        difficulty: body.difficulty,
        words,
      });

      return NextResponse.json(story);
    }

    if (!body.language || !body.topic) {
      return NextResponse.json(
        { error: "language and topic are required" },
        { status: 400 }
      );
    }

    const story = await generateStory({
      language: body.language,
      nativeLang: body.nativeLang,
      topic: body.topic,
      difficulty: body.difficulty,
    });

    return NextResponse.json(story);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Story generation error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
