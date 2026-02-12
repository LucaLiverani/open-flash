import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getDB() {
  const { env } = await getCloudflareContext();
  return env.openflash_db;
}

export interface Deck {
  id: string;
  name: string;
  emoji: string;
  source_lang: string;
  target_lang: string;
  created_at: string;
}

export interface DeckWithCounts extends Deck {
  card_count: number;
  due_count: number;
}

export interface Card {
  id: string;
  deck_id: string;
  word: string;
  translation: string;
  example_sentence: string | null;
  emoji: string;
  interval: number;
  repetitions: number;
  ease_factor: number;
  next_review: string;
  created_at: string;
}

export type LanguageCode = "en" | "es" | "it" | "fr" | "de" | "pt" | "ja" | "zh" | "ko";

export const LANGUAGES: Record<LanguageCode, string> = {
  en: "English",
  es: "Spanish",
  it: "Italian",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  ja: "Japanese",
  zh: "Chinese",
  ko: "Korean",
};
