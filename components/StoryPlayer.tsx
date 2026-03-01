"use client";

import { useState, useCallback, useRef } from "react";
import { useStoryPlayer } from "@/lib/useStoryPlayer";
import WordTooltip from "./WordTooltip";

interface StoryPlayerProps {
  title: string;
  sentences: string[];
  translation: string;
  language: string;
  nativeLang: string;
  onNewStory: () => void;
}

interface TooltipState {
  word: string;
  rect: DOMRect;
}

export default function StoryPlayer({
  title,
  sentences,
  translation,
  language,
  nativeLang,
  onNewStory,
}: StoryPlayerProps) {
  const { activeSentenceIndex, isPlaying, play, pause, jumpTo, stop } =
    useStoryPlayer(sentences, language);
  const [showTranslation, setShowTranslation] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Long-press to pause
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const handleTouchStart = useCallback(() => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      if (isPlaying) pause();
    }, 500);
  }, [isPlaying, pause]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (longPressTriggered.current) play();
  }, [play]);

  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleWordClick = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>, word: string) => {
      e.stopPropagation();
      if (longPressTriggered.current) return;
      const cleaned = word.replace(/[.,;:!?"""''()[\]{}]/g, "").trim();
      if (!cleaned) return;
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setTooltip({ word: cleaned, rect });
    },
    []
  );

  const handleSentenceClick = useCallback(
    (index: number) => {
      if (longPressTriggered.current) return;
      jumpTo(index);
    },
    [jumpTo]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-bold text-text">{title}</h2>
        <button
          onClick={() => {
            stop();
            onNewStory();
          }}
          className="btn btn-secondary text-sm shrink-0"
        >
          New Story
        </button>
      </div>

      {/* Playback controls */}
      <div className="flex items-center flex-wrap gap-3">
        {isPlaying ? (
          <button onClick={pause} className="btn btn-primary">
            Pause
          </button>
        ) : (
          <button onClick={play} className="btn btn-primary">
            {activeSentenceIndex >= 0 ? "Resume" : "Play"}
          </button>
        )}
        <button
          onClick={stop}
          disabled={activeSentenceIndex < 0}
          className="btn btn-secondary"
        >
          Stop
        </button>
        <label className="ml-auto flex items-center gap-2 text-sm text-text-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showTranslation}
            onChange={(e) => setShowTranslation(e.target.checked)}
            className="rounded"
          />
          Show Translation
        </label>
      </div>

      {/* Story text — long-press to pause audio */}
      <div
        className="bg-surface rounded-xl border border-border p-4 sm:p-5 text-lg leading-relaxed select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        {sentences.map((sentence, sIndex) => (
          <span
            key={sIndex}
            onClick={() => handleSentenceClick(sIndex)}
            className={`cursor-pointer rounded transition-colors ${
              sIndex === activeSentenceIndex
                ? "bg-primary/20"
                : "hover:bg-surface-hover"
            }`}
          >
            {sentence.split(/(\s+)/).map((token, tIndex) => {
              if (/^\s+$/.test(token)) {
                return <span key={tIndex}>{token}</span>;
              }
              return (
                <span
                  key={tIndex}
                  onClick={(e) => handleWordClick(e, token)}
                  className="cursor-pointer hover:bg-primary/10 active:bg-primary/20 rounded px-0.5 transition-colors"
                >
                  {token}
                </span>
              );
            })}{" "}
          </span>
        ))}
      </div>

      {/* Translation */}
      {showTranslation && (
        <div className="bg-surface-hover rounded-xl border border-border p-5 text-base text-text-muted leading-relaxed">
          {translation}
        </div>
      )}

      {/* Word tooltip */}
      {tooltip && (
        <WordTooltip
          word={tooltip.word}
          rect={tooltip.rect}
          sourceLang={language}
          targetLang={nativeLang}
          onDismiss={() => setTooltip(null)}
        />
      )}
    </div>
  );
}
