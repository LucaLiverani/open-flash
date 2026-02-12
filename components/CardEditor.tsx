"use client";

import { useState } from "react";

interface CardEditorProps {
  deckId: string;
  sourceLang: string;
  targetLang: string;
  onCardCreated: () => void;
}

export default function CardEditor({
  deckId,
  sourceLang,
  targetLang,
  onCardCreated,
}: CardEditorProps) {
  const [word, setWord] = useState("");
  const [translation, setTranslation] = useState("");
  const [exampleSentence, setExampleSentence] = useState("");
  const [emoji, setEmoji] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  async function handleAITranslate() {
    if (!word.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: word.trim(),
          source_lang: targetLang,
          target_lang: sourceLang,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { translation: string; exampleSentence: string; emoji: string };
        setTranslation(data.translation);
        setExampleSentence(data.exampleSentence);
        setEmoji(data.emoji);
      }
    } catch (error) {
      console.error("AI translate failed:", error);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!word.trim() || !translation.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deck_id: deckId,
          word: word.trim(),
          translation: translation.trim(),
          example_sentence: exampleSentence.trim() || null,
          emoji: emoji.trim() || "📝",
        }),
      });
      if (res.ok) {
        setWord("");
        setTranslation("");
        setExampleSentence("");
        setEmoji("");
        onCardCreated();
      }
    } catch (error) {
      console.error("Failed to create card:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-5">
      <h3 className="font-semibold mb-4">Add Card</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-sm text-text-muted mb-1">Word</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="Enter word..."
              className="input flex-1"
            />
            <button
              type="button"
              onClick={handleAITranslate}
              disabled={!word.trim() || aiLoading}
              className="btn btn-secondary"
            >
              {aiLoading ? "..." : "AI"}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm text-text-muted mb-1">Translation</label>
          <input
            type="text"
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            placeholder="Translation..."
            className="input"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_80px] gap-3 mb-4">
        <div>
          <label className="block text-sm text-text-muted mb-1">Example sentence</label>
          <input
            type="text"
            value={exampleSentence}
            onChange={(e) => setExampleSentence(e.target.value)}
            placeholder="Example sentence..."
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm text-text-muted mb-1">Emoji</label>
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="📝"
            className="input"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={!word.trim() || !translation.trim() || loading}
        className="btn btn-primary"
      >
        {loading ? "Adding..." : "Add Card"}
      </button>
    </form>
  );
}
