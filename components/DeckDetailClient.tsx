"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Deck, Card } from "@/lib/db";
import { LANGUAGES, type LanguageCode } from "@/lib/db";
import CardEditor from "./CardEditor";
import BulkGenerator from "./BulkGenerator";

interface DeckDetailClientProps {
  deck: Deck;
  initialCards: Card[];
  dueCount: number;
}

export default function DeckDetailClient({
  deck,
  initialCards,
  dueCount,
}: DeckDetailClientProps) {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [resetStep, setResetStep] = useState<0 | 1>(0);
  const [resetting, setResetting] = useState(false);

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch(`/api/cards?deck_id=${deck.id}`);
      if (res.ok) {
        const data = await res.json() as Card[];
        setCards(data);
      }
    } catch (error) {
      console.error("Failed to fetch cards:", error);
    }
  }, [deck.id]);

  async function handleDeleteCard(cardId: string) {
    try {
      const res = await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
      if (res.ok) {
        setCards((prev) => prev.filter((c) => c.id !== cardId));
      }
    } catch (error) {
      console.error("Failed to delete card:", error);
    }
  }

  const sourceName = LANGUAGES[deck.source_lang as LanguageCode] ?? deck.source_lang;
  const targetName = LANGUAGES[deck.target_lang as LanguageCode] ?? deck.target_lang;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">{deck.emoji}</span>
            <h1 className="text-2xl font-bold">{deck.name}</h1>
          </div>
          <p className="text-text-muted text-sm">
            {sourceName} → {targetName} &middot; {cards.length} cards
            {dueCount > 0 && (
              <span className="ml-2 text-accent font-medium">
                {dueCount} due
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {cards.length > 0 && (
            <Link
              href={`/decks/${deck.id}/study`}
              className={`btn ${dueCount > 0 ? "btn-primary" : "btn-ghost"}`}
            >
              {dueCount > 0 ? `Study (${dueCount} due)` : "Practice"}
            </Link>
          )}
          <button
            onClick={() => setResetStep(1)}
            className="btn btn-ghost text-danger"
          >
            Reset Study
          </button>
          <Link
            href={`/decks/${deck.id}/edit`}
            className="btn btn-ghost"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Reset progress */}
      {resetStep === 1 && (
        <div className="flex items-center gap-3 mb-6 bg-danger/10 border border-danger/30 rounded-xl p-4">
          <p className="text-sm text-danger font-medium flex-1">
            Reset all study progress? Cards will be kept but all intervals and repetitions go back to zero.
          </p>
          <button
            onClick={async () => {
              setResetting(true);
              try {
                const res = await fetch(`/api/decks/${deck.id}/reset`, { method: "POST" });
                if (res.ok) {
                  setResetStep(0);
                  router.refresh();
                }
              } catch (error) {
                console.error("Failed to reset:", error);
              } finally {
                setResetting(false);
              }
            }}
            disabled={resetting}
            className="btn btn-danger"
          >
            {resetting ? "Resetting..." : "Yes, reset"}
          </button>
          <button onClick={() => setResetStep(0)} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      )}

      {/* Card Editor */}
      <div className="mb-4">
        <CardEditor
          deckId={deck.id}
          sourceLang={deck.source_lang}
          targetLang={deck.target_lang}
          onCardCreated={fetchCards}
        />
      </div>

      {/* Bulk Generator */}
      <div className="mb-6">
        <BulkGenerator
          deckId={deck.id}
          sourceLang={deck.source_lang}
          targetLang={deck.target_lang}
          onCardsCreated={fetchCards}
        />
      </div>

      {/* Card list */}
      {cards.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Cards ({cards.length})</h2>
          <div className="space-y-2">
            {cards.map((card) => (
              <div
                key={card.id}
                className="flex items-center gap-3 bg-surface rounded-lg border border-border p-3"
              >
                <span className="text-lg">{card.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {card.word} → {card.translation}
                  </p>
                  {card.example_sentence && (
                    <p className="text-xs text-text-muted truncate">
                      {card.example_sentence}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">
                    {card.repetitions > 0
                      ? `${card.interval}d interval`
                      : "New"}
                  </span>
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    className="text-text-muted hover:text-danger transition-colors text-sm"
                    title="Delete card"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
