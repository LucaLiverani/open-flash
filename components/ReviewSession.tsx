"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Card } from "@/lib/db";
import FlashCard from "./FlashCard";

interface ReviewSessionProps {
  cards: Card[];
  isPractice?: boolean;
  onComplete: (results: ReviewResult[]) => void;
}

export interface ReviewResult {
  cardId: string;
  quality: 0 | 2 | 3 | 5;
}

const RATINGS = [
  { quality: 0 as const, label: "Again", key: "1", color: "bg-danger hover:bg-danger-dark" },
  { quality: 2 as const, label: "Hard", key: "2", color: "bg-accent hover:bg-accent-dark" },
  { quality: 3 as const, label: "Good", key: "3", color: "bg-secondary hover:bg-secondary-dark" },
  { quality: 5 as const, label: "Easy", key: "4", color: "bg-primary hover:bg-primary-dark text-black" },
];

export default function ReviewSession({ cards, isPractice, onComplete }: ReviewSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const resultsRef = useRef<ReviewResult[]>([]);

  const currentCard = cards[currentIndex];
  const isFinished = currentIndex >= cards.length;

  const handleFlip = useCallback(() => {
    if (!isFinished) setFlipped((f) => !f);
  }, [isFinished]);

  const handleRate = useCallback(
    (quality: 0 | 2 | 3 | 5) => {
      if (!currentCard || !flipped) return;

      const newResult: ReviewResult = { cardId: currentCard.id, quality };
      resultsRef.current = [...resultsRef.current, newResult];

      // Only update SM-2 in review mode, not practice
      if (!isPractice) {
        fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ card_id: currentCard.id, quality }),
        }).catch(console.error);
      }

      // Move to next card
      if (currentIndex + 1 >= cards.length) {
        onComplete(resultsRef.current);
      } else {
        setCurrentIndex(currentIndex + 1);
        setFlipped(false);
      }
    },
    [currentCard, flipped, currentIndex, cards.length, onComplete, isPractice]
  );

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleFlip();
      } else if (flipped) {
        if (e.key === "1") handleRate(0);
        else if (e.key === "2") handleRate(2);
        else if (e.key === "3") handleRate(3);
        else if (e.key === "4") handleRate(5);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleFlip, handleRate, flipped]);

  if (isFinished) return null;

  return (
    <div>
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-text-muted mb-1">
          <span>
            Card {currentIndex + 1} of {cards.length}
          </span>
          <span>{Math.round(((currentIndex + 1) / cards.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <FlashCard card={currentCard} flipped={flipped} onFlip={handleFlip} />

      {/* Rating buttons */}
      {flipped && (
        <div className="grid grid-cols-4 gap-2 sm:flex sm:justify-center sm:gap-3 mt-6">
          {RATINGS.map((r) => (
            <button
              key={r.quality}
              onClick={() => handleRate(r.quality)}
              className={`btn text-white ${r.color}`}
            >
              {r.label}
              <span className="ml-1 opacity-60 text-xs hidden sm:inline">({r.key})</span>
            </button>
          ))}
        </div>
      )}

      {/* Hint */}
      {!flipped && (
        <p className="text-center text-sm text-text-muted mt-6">
          Press <kbd className="px-1.5 py-0.5 bg-surface-hover border border-border rounded text-xs font-mono">Space</kbd> or tap the card to flip
        </p>
      )}
    </div>
  );
}
