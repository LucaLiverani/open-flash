"use client";

import { useEffect } from "react";
import type { Card } from "@/lib/db";
import { useSpeech } from "@/lib/useSpeech";
import SpeakButton from "./SpeakButton";

interface FlashCardProps {
  card: Card;
  flipped: boolean;
  onFlip: () => void;
  sourceLang: string;
  targetLang: string;
  nextWord?: string;
}

export default function FlashCard({ card, flipped, onFlip, sourceLang, targetLang, nextWord }: FlashCardProps) {
  const { speak, prefetch, isSpeaking, isSupported } = useSpeech();

  // Prefetch word audio when the card appears
  useEffect(() => {
    prefetch(card.word, targetLang);
  }, [card.id, card.word, targetLang, prefetch]);

  // Prefetch sentence audio when flipped + next card's word
  useEffect(() => {
    if (flipped) {
      if (card.example_sentence) prefetch(card.example_sentence, targetLang);
      if (nextWord) prefetch(nextWord, targetLang);
    }
  }, [flipped, card.id, card.example_sentence, nextWord, targetLang, prefetch]);

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
          <div className="flex items-center gap-1">
            <p className="text-2xl font-bold text-center">{card.word}</p>
            <SpeakButton
              onClick={(e) => { e.stopPropagation(); speak(card.word, targetLang); }}
              isSpeaking={isSpeaking}
              isSupported={isSupported}
            />
          </div>
          <p className="text-sm text-text-muted mt-3">Tap to reveal</p>
        </div>
        {/* Back */}
        <div className="backface-hidden rotate-y-180 absolute inset-0 bg-primary/10 rounded-2xl border border-primary/30 shadow-lg flex flex-col items-center justify-center p-6">
          <span className="text-4xl mb-3">{card.emoji}</span>
          <p className="text-2xl font-bold text-center text-primary mb-3">
            {card.translation}
          </p>
          {card.example_sentence && (
            <div className="flex items-center gap-1">
              <p className="text-sm text-text-muted text-center italic">
                {card.example_sentence}
              </p>
              <SpeakButton
                onClick={(e) => { e.stopPropagation(); speak(card.example_sentence!, targetLang); }}
                isSpeaking={isSpeaking}
                isSupported={isSupported}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
