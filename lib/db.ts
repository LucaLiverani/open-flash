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

export interface LanguageTensePrefs {
  language: string;
  all_tenses: string;      // JSON string
  selected_tenses: string; // JSON string
  created_at: string;
}

export interface SavedVerb {
  id: string;
  language: string;
  infinitive: string;
  meaning: string;
  conjugations: string;    // JSON string
  verb_deck_id: string | null;
  created_at: string;
}

export interface VerbStudyProgress {
  id: string;
  saved_verb_id: string;
  tense: string;
  interval: number;
  repetitions: number;
  ease_factor: number;
  next_review: string;
  created_at: string;
}

export interface VerbDeck {
  id: string;
  name: string;
  emoji: string;
  language: string;
  translation_lang: string;
  created_at: string;
}

export interface VerbDeckWithCounts extends VerbDeck {
  verb_count: number;
  due_count: number;
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

export function toLanguageCode(langOrCode: string): LanguageCode | undefined {
  if (langOrCode in LANGUAGES) return langOrCode as LanguageCode;
  const entry = Object.entries(LANGUAGES).find(
    ([, name]) => name.toLowerCase() === langOrCode.toLowerCase()
  );
  return entry ? (entry[0] as LanguageCode) : undefined;
}
