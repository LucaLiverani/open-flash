"use client";

import { useState, useEffect } from "react";
import type { Deck } from "@/lib/db";

interface AddToVocabDeckModalProps {
  word: string;
  translation: string;
  exampleSentence?: string;
  sourceLang: string;
  targetLang: string;
  onClose: (successMessage?: string) => void;
}

export default function AddToVocabDeckModal({
  word,
  translation,
  exampleSentence,
  sourceLang,
  targetLang,
  onClose,
}: AddToVocabDeckModalProps) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load decks filtered by matching source language
  useEffect(() => {
    fetch("/api/decks")
      .then((res) => res.json() as Promise<Deck[]>)
      .then((all) => {
        const matching = all.filter((d) => d.target_lang === sourceLang);
        setDecks(matching);
        if (matching.length > 0) setSelectedDeckId(matching[0].id);
      })
      .catch(() => setError("Failed to load decks"));
  }, [sourceLang]);

  async function handleSave() {
    if (!selectedDeckId) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deck_id: selectedDeckId,
          word,
          translation,
          example_sentence: exampleSentence || null,
          emoji: "📝",
        }),
      });

      if (!res.ok) throw new Error("Failed to save card");
      const card = await res.json() as { id: string };

      // Background: fetch better emoji from AI and update card
      const deckName = decks.find((d) => d.id === selectedDeckId)?.name ?? "deck";
      fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, source_lang: sourceLang, target_lang: targetLang }),
      })
        .then((r) => r.json() as Promise<{ emoji?: string }>)
        .then(({ emoji }) => {
          if (emoji) {
            fetch(`/api/cards/${card.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ emoji }),
            }).catch(() => {});
          }
        })
        .catch(() => {});

      onClose(`Added to ${deckName}`);
    } catch {
      setError("Failed to save word. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-surface rounded-xl border border-border shadow-xl w-full max-w-sm p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text">Add word to deck</h3>
          <button
            onClick={() => onClose()}
            className="text-text-muted hover:text-text transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Word preview */}
        <div className="bg-surface-hover rounded-lg px-3 py-2 text-sm">
          <span className="font-medium text-text">{word}</span>
          <span className="text-text-muted"> → </span>
          <span className="text-text-muted">&ldquo;{translation}&rdquo;</span>
        </div>

        {/* Deck picker */}
        {decks.length === 0 ? (
          <p className="text-sm text-text-muted">
            No decks found for this language. Create a deck first.
          </p>
        ) : (
          <div>
            <label className="block text-xs text-text-muted mb-1">Deck</label>
            <select
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              className="input w-full"
            >
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.emoji} {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => onClose()}
            className="btn btn-secondary text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedDeckId || decks.length === 0}
            className="btn btn-primary text-sm"
          >
            {saving ? "Saving..." : "Add word"}
          </button>
        </div>
      </div>
    </div>
  );
}
