"use client";

import { useState } from "react";

interface BulkCard {
  word: string;
  translation: string;
  exampleSentence: string;
  emoji: string;
  selected: boolean;
}

interface BulkGeneratorProps {
  deckId: string;
  sourceLang: string;
  targetLang: string;
  onCardsCreated: () => void;
}

const TOPIC_PRESETS = [
  "Common greetings",
  "Food & cooking",
  "Travel & transport",
  "Family & relationships",
  "Numbers & time",
  "Colors & shapes",
  "Weather & nature",
  "Shopping & money",
];

export default function BulkGenerator({
  deckId,
  sourceLang,
  targetLang,
  onCardsCreated,
}: BulkGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cards, setCards] = useState<BulkCard[]>([]);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setCards([]);
    try {
      const res = await fetch("/api/ai/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          source_lang: targetLang,
          target_lang: sourceLang,
          count,
        }),
      });
      if (res.ok) {
        const data = await res.json() as Omit<BulkCard, "selected">[];
        setCards(data.map((c) => ({ ...c, selected: true })));
      }
    } catch (error) {
      console.error("Bulk generate failed:", error);
    } finally {
      setGenerating(false);
    }
  }

  function toggleCard(index: number) {
    setCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c))
    );
  }

  async function handleSaveSelected() {
    const selected = cards.filter((c) => c.selected);
    if (selected.length === 0) return;

    setSaving(true);
    try {
      await Promise.all(
        selected.map((card) =>
          fetch("/api/cards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              deck_id: deckId,
              word: card.word,
              translation: card.translation,
              example_sentence: card.exampleSentence,
              emoji: card.emoji,
            }),
          })
        )
      );
      setCards([]);
      setPrompt("");
      onCardsCreated();
    } catch (error) {
      console.error("Failed to save cards:", error);
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = cards.filter((c) => c.selected).length;

  return (
    <div className="bg-surface rounded-xl border border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between text-left"
      >
        <h3 className="font-semibold">AI Bulk Generator</h3>
        <span className="text-text-muted text-sm">{isOpen ? "Close" : "Open"}</span>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-border pt-4">
          {/* Topic presets */}
          <div className="flex flex-wrap gap-2 mb-3">
            {TOPIC_PRESETS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => setPrompt(topic)}
                className="px-3 py-1.5 text-sm bg-surface-hover text-text-muted rounded-full hover:bg-border-light hover:text-text transition-colors"
              >
                {topic}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a topic or custom prompt..."
              className="input sm:flex-1"
            />
            <div className="flex gap-2">
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="input !w-18 shrink-0"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
              </select>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || generating}
                className="btn btn-secondary flex-1 sm:flex-none"
              >
                {generating ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>

          {/* Card results */}
          {cards.length > 0 && (
            <>
              <div className="space-y-2 max-h-80 overflow-y-auto mb-4">
                {cards.map((card, i) => (
                  <label
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      card.selected
                        ? "border-primary/30 bg-primary/10"
                        : "border-border bg-surface-hover"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={card.selected}
                      onChange={() => toggleCard(i)}
                      className="rounded"
                    />
                    <span className="text-lg">{card.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {card.word} → {card.translation}
                      </p>
                      <p className="text-xs text-text-muted truncate">
                        {card.exampleSentence}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              <button
                onClick={handleSaveSelected}
                disabled={selectedCount === 0 || saving}
                className="btn btn-primary"
              >
                {saving
                  ? "Saving..."
                  : `Save ${selectedCount} card${selectedCount !== 1 ? "s" : ""}`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
