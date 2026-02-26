"use client";

import { useState, useEffect } from "react";
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
  reverseMode?: boolean;
}

export default function FlashCard({ card, flipped, onFlip, sourceLang, targetLang, nextWord, reverseMode }: FlashCardProps) {
  const { speak, prefetch, isSpeaking, isSupported } = useSpeech();
  const [sentenceTranslation, setSentenceTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  // Reset translation when card changes
  useEffect(() => {
    setSentenceTranslation(null);
  }, [card.id]);

  async function handleTranslateSentence(e: React.MouseEvent) {
    e.stopPropagation();
    if (translating || sentenceTranslation) return;
    setTranslating(true);
    try {
      const res = await fetch("/api/ai/translate-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentence: card.example_sentence,
          source_lang: targetLang,
          target_lang: sourceLang,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { translation: string };
        setSentenceTranslation(data.translation);
      }
    } catch (error) {
      console.error("Failed to translate sentence:", error);
    } finally {
      setTranslating(false);
    }
  }

  const frontText = reverseMode ? card.translation : card.word;
  const frontLang = reverseMode ? sourceLang : targetLang;
  const backText = reverseMode ? card.word : card.translation;
  const backLang = reverseMode ? targetLang : sourceLang;

  // Prefetch front-side audio when the card appears
  useEffect(() => {
    prefetch(frontText, frontLang);
  }, [card.id, frontText, frontLang, prefetch]);

  // Prefetch back-side audio when flipped + next card's front text
  useEffect(() => {
    if (flipped) {
      if (card.example_sentence) prefetch(card.example_sentence, targetLang);
      if (nextWord) prefetch(nextWord, reverseMode ? sourceLang : targetLang);
    }
  }, [flipped, card.id, card.example_sentence, nextWord, targetLang, sourceLang, reverseMode, prefetch]);

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
            <p className="text-2xl font-bold text-center">{frontText}</p>
            <SpeakButton
              onClick={(e) => { e.stopPropagation(); speak(frontText, frontLang); }}
              isSpeaking={isSpeaking}
              isSupported={isSupported}
            />
          </div>
          <p className="text-sm text-text-muted mt-3">Tap to reveal</p>
        </div>
        {/* Back */}
        <div className="backface-hidden rotate-y-180 absolute inset-0 bg-primary/10 rounded-2xl border border-primary/30 shadow-lg flex flex-col items-center justify-center p-6">
          <span className="text-4xl mb-3">{card.emoji}</span>
          <div className="flex items-center gap-1">
            <p className="text-2xl font-bold text-center text-primary mb-3">
              {backText}
            </p>
            <SpeakButton
              onClick={(e) => { e.stopPropagation(); speak(backText, backLang); }}
              isSpeaking={isSpeaking}
              isSupported={isSupported}
            />
          </div>
          {card.example_sentence && (
            <div className="flex flex-col items-center gap-1">
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
              {sentenceTranslation ? (
                <p className="text-xs text-text-muted text-center">
                  {sentenceTranslation}
                </p>
              ) : (
                <button
                  onClick={handleTranslateSentence}
                  disabled={translating}
                  className="text-xs text-accent hover:underline"
                >
                  {translating ? "Translating..." : "Translate"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
