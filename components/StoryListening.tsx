"use client";

import { useState, useEffect } from "react";
import { LANGUAGES, type LanguageCode } from "@/lib/db";
import StoryPlayer from "./StoryPlayer";

const TOPIC_PRESETS = [
  "A day at the market",
  "Cooking dinner",
  "A trip to the beach",
  "Meeting a friend",
  "A rainy day",
  "Lost in the city",
  "At the restaurant",
  "A morning routine",
];

interface StoryData {
  title: string;
  sentences: string[];
  translation: string;
}

interface DeckOption {
  id: string;
  name: string;
  emoji: string;
  source_lang: string;
  target_lang: string;
}

type Mode = "topic" | "deck";
type Difficulty = "beginner" | "intermediate";

export default function StoryListening() {
  const [mode, setMode] = useState<Mode>("topic");
  const [language, setLanguage] = useState<LanguageCode>("es");
  const [nativeLang, setNativeLang] = useState<LanguageCode>("it");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [story, setStory] = useState<StoryData | null>(null);

  // Deck mode state
  const [decks, setDecks] = useState<DeckOption[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [loadingDecks, setLoadingDecks] = useState(false);

  useEffect(() => {
    if (mode === "deck" && decks.length === 0) {
      setLoadingDecks(true);
      fetch("/api/decks")
        .then((res) => res.json() as Promise<DeckOption[]>)
        .then((data) => {
          setDecks(data);
          if (data.length > 0) setSelectedDeckId(data[0].id);
        })
        .catch(() => {})
        .finally(() => setLoadingDecks(false));
    }
  }, [mode, decks.length]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);

    try {
      const body =
        mode === "deck"
          ? { deckId: selectedDeckId, difficulty }
          : { language, nativeLang, topic: topic.trim(), difficulty };

      const res = await fetch("/api/stories/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error: string };
        throw new Error(data.error || "Generation failed");
      }

      const data = (await res.json()) as StoryData;
      setStory(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  if (story) {
    const storyLang =
      mode === "deck"
        ? (decks.find((d) => d.id === selectedDeckId)?.target_lang as LanguageCode) ?? language
        : language;
    const storyNativeLang =
      mode === "deck"
        ? (decks.find((d) => d.id === selectedDeckId)?.source_lang as LanguageCode) ?? nativeLang
        : nativeLang;

    return (
      <StoryPlayer
        title={story.title}
        sentences={story.sentences}
        translation={story.translation}
        language={storyLang}
        nativeLang={storyNativeLang}
        onNewStory={() => setStory(null)}
      />
    );
  }

  const langEntries = Object.entries(LANGUAGES) as [LanguageCode, string][];
  const canGenerate =
    mode === "deck"
      ? !!selectedDeckId
      : !!topic.trim() && !!language && !!nativeLang;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-text">Story Listening</h2>
      <p className="text-text-muted text-sm">
        Generate a short story in your target language, listen to it with
        sentence-level highlighting, and tap any word for instant translation.
      </p>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-surface-hover rounded-lg p-1">
        <button
          onClick={() => setMode("topic")}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            mode === "topic"
              ? "bg-surface text-text shadow-sm"
              : "text-text-muted hover:text-text"
          }`}
        >
          Topic
        </button>
        <button
          onClick={() => setMode("deck")}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            mode === "deck"
              ? "bg-surface text-text shadow-sm"
              : "text-text-muted hover:text-text"
          }`}
        >
          From Deck
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-border p-5 space-y-5">
        {mode === "topic" ? (
          <>
            {/* Language selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Target Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                  className="input w-full"
                >
                  {langEntries.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Your Language
                </label>
                <select
                  value={nativeLang}
                  onChange={(e) =>
                    setNativeLang(e.target.value as LanguageCode)
                  }
                  className="input w-full"
                >
                  {langEntries.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Topic presets */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Topic
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {TOPIC_PRESETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTopic(t)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      topic === t
                        ? "bg-primary/20 text-primary"
                        : "bg-surface-hover text-text-muted hover:bg-border-light hover:text-text"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Or enter a custom topic..."
                className="input w-full"
              />
            </div>
          </>
        ) : (
          /* Deck mode */
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Select a Deck
            </label>
            {loadingDecks ? (
              <p className="text-sm text-text-muted">Loading decks...</p>
            ) : decks.length === 0 ? (
              <p className="text-sm text-text-muted">
                No decks found. Create a flashcard deck first.
              </p>
            ) : (
              <select
                value={selectedDeckId}
                onChange={(e) => setSelectedDeckId(e.target.value)}
                className="input w-full"
              >
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.emoji} {deck.name} ({LANGUAGES[deck.source_lang as LanguageCode] ?? deck.source_lang} →{" "}
                    {LANGUAGES[deck.target_lang as LanguageCode] ?? deck.target_lang})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Difficulty toggle */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Difficulty
          </label>
          <div className="flex gap-1 bg-surface-hover rounded-lg p-1 w-fit">
            <button
              onClick={() => setDifficulty("beginner")}
              className={`py-1.5 px-4 text-sm font-medium rounded-md transition-colors ${
                difficulty === "beginner"
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Beginner
            </button>
            <button
              onClick={() => setDifficulty("intermediate")}
              className={`py-1.5 px-4 text-sm font-medium rounded-md transition-colors ${
                difficulty === "intermediate"
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Intermediate
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <button
          onClick={handleGenerate}
          disabled={!canGenerate || generating}
          className="btn btn-primary"
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Generating story…
            </span>
          ) : (
            "Generate Story"
          )}
        </button>
      </div>
    </div>
  );
}
