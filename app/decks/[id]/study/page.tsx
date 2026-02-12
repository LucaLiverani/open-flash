"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Card } from "@/lib/db";
import ReviewSession, { type ReviewResult } from "@/components/ReviewSession";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";

function shuffleAndPrioritize(cards: Card[]): Card[] {
  // Score: lower ease_factor and more failures = higher priority
  const scored = cards.map((card) => ({
    card,
    score: card.ease_factor - (card.repetitions === 0 ? 1 : 0),
  }));
  // Sort by score (hardest first), then shuffle within similar scores
  scored.sort((a, b) => {
    const diff = a.score - b.score;
    if (Math.abs(diff) < 0.3) return Math.random() - 0.5;
    return diff;
  });
  return scored.map((s) => s.card);
}

const PRACTICE_COUNTS = [10, 20, 30, 50, 0] as const;

export default function StudyPage() {
  const params = useParams<{ id: string }>();
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"due" | "all" | null>(null);
  const [results, setResults] = useState<ReviewResult[] | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/decks/${params.id}/due`);
        if (res.ok) {
          const data = await res.json() as Card[];
          if (data.length > 0) {
            setCards(data);
            setMode("due");
          } else {
            // Pre-fetch all cards for practice options
            const allRes = await fetch(`/api/cards?deck_id=${params.id}`);
            if (allRes.ok) {
              setAllCards(await allRes.json() as Card[]);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load cards:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  function startPractice(count: number) {
    const shuffled = shuffleAndPrioritize(allCards);
    const selected = count === 0 ? shuffled : shuffled.slice(0, count);
    setCards(selected);
    setMode("all");
  }

  const handleComplete = useCallback((reviewResults: ReviewResult[]) => {
    setResults(reviewResults);
  }, []);

  if (loading) return <LoadingSpinner text="Loading study session..." />;

  // No due cards and haven't chosen practice mode yet
  if (mode === null) {
    if (allCards.length === 0) {
      return (
        <EmptyState
          emoji="📭"
          title="No cards yet"
          description="Add some cards to this deck first, then come back to study."
          ctaText="Back to Deck"
          ctaHref={`/decks/${params.id}`}
        />
      );
    }

    return (
      <div className="max-w-md mx-auto text-center py-10">
        <span className="text-5xl mb-4 block">🎉</span>
        <h1 className="text-2xl font-bold mb-2">All caught up!</h1>
        <p className="text-text-muted mb-6">
          No cards are due right now. Practice to keep sharp?
        </p>
        <p className="text-sm text-text-muted mb-4">
          Cards are shuffled with harder ones first.
        </p>
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {PRACTICE_COUNTS.map((count) => {
            if (count !== 0 && count > allCards.length) return null;
            const label = count === 0 ? `All (${allCards.length})` : `${count} cards`;
            return (
              <button
                key={count}
                onClick={() => startPractice(count)}
                className="btn btn-primary"
              >
                {label}
              </button>
            );
          })}
        </div>
        <Link href={`/decks/${params.id}`} className="btn btn-ghost">
          Back to Deck
        </Link>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <EmptyState
        emoji="📭"
        title="No cards yet"
        description="Add some cards to this deck first, then come back to study."
        ctaText="Back to Deck"
        ctaHref={`/decks/${params.id}`}
      />
    );
  }

  // Show summary when finished
  if (results) {
    const again = results.filter((r) => r.quality === 0).length;
    const hard = results.filter((r) => r.quality === 2).length;
    const good = results.filter((r) => r.quality === 3).length;
    const easy = results.filter((r) => r.quality === 5).length;

    return (
      <div className="max-w-md mx-auto text-center py-10">
        <span className="text-5xl mb-4 block">🎊</span>
        <h1 className="text-2xl font-bold mb-2">Session Complete!</h1>
        <p className="text-text-muted mb-6">
          You reviewed {results.length} card{results.length !== 1 ? "s" : ""}.
        </p>
        <div className="grid grid-cols-4 gap-3 mb-8">
          <div className="bg-danger/10 rounded-lg p-3">
            <p className="text-2xl font-bold text-danger">{again}</p>
            <p className="text-xs text-text-muted">Again</p>
          </div>
          <div className="bg-accent/10 rounded-lg p-3">
            <p className="text-2xl font-bold text-accent-dark">{hard}</p>
            <p className="text-xs text-text-muted">Hard</p>
          </div>
          <div className="bg-secondary/10 rounded-lg p-3">
            <p className="text-2xl font-bold text-secondary-dark">{good}</p>
            <p className="text-xs text-text-muted">Good</p>
          </div>
          <div className="bg-primary/10 rounded-lg p-3">
            <p className="text-2xl font-bold text-primary">{easy}</p>
            <p className="text-xs text-text-muted">Easy</p>
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          <Link href={`/decks/${params.id}`} className="btn btn-ghost">
            Back to Deck
          </Link>
          <button
            onClick={() => {
              setResults(null);
              setMode(null);
              setCards([]);
              setLoading(true);
              fetch(`/api/decks/${params.id}/due`)
                .then((r) => r.json() as Promise<Card[]>)
                .then(async (data) => {
                  if (data.length > 0) {
                    setCards(data);
                    setMode("due");
                  } else {
                    const allRes = await fetch(`/api/cards?deck_id=${params.id}`);
                    if (allRes.ok) {
                      setAllCards(await allRes.json() as Card[]);
                    }
                  }
                })
                .finally(() => setLoading(false));
            }}
            className="btn btn-primary"
          >
            Study Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      {mode === "all" && (
        <p className="text-center text-sm text-text-muted mb-4">
          Practice mode — {cards.length} cards, hardest first
        </p>
      )}
      <ReviewSession cards={cards} isPractice={mode === "all"} onComplete={handleComplete} />
    </div>
  );
}
