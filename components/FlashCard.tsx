"use client";

import { useState } from "react";
import type { Card } from "@/lib/db";

interface FlashCardProps {
  card: Card;
  flipped: boolean;
  onFlip: () => void;
}

export default function FlashCard({ card, flipped, onFlip }: FlashCardProps) {
  return (
    <div
      className="perspective-1000 w-full max-w-md mx-auto cursor-pointer"
      onClick={onFlip}
    >
      <div
        className={`preserve-3d relative w-full h-56 sm:h-64 transition-transform duration-500 ${
          flipped ? "rotate-y-180" : ""
        }`}
      >
        {/* Front */}
        <div className="backface-hidden absolute inset-0 bg-surface rounded-2xl border border-border shadow-lg flex flex-col items-center justify-center p-6">
          <span className="text-4xl mb-4">{card.emoji}</span>
          <p className="text-2xl font-bold text-center">{card.word}</p>
          <p className="text-sm text-text-muted mt-4">Tap to reveal</p>
        </div>
        {/* Back */}
        <div className="backface-hidden rotate-y-180 absolute inset-0 bg-primary/10 rounded-2xl border border-primary/30 shadow-lg flex flex-col items-center justify-center p-6">
          <span className="text-4xl mb-3">{card.emoji}</span>
          <p className="text-2xl font-bold text-center text-primary mb-3">
            {card.translation}
          </p>
          {card.example_sentence && (
            <p className="text-sm text-text-muted text-center italic">
              {card.example_sentence}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
