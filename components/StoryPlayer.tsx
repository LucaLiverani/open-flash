"use client";

import { useState, useCallback } from "react";
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

  const handleWordClick = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>, word: string) => {
      e.stopPropagation();
      const cleaned = word.replace(/[.,;:!?"""''()[\]{}]/g, "").trim();
      if (!cleaned) return;
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setTooltip({ word: cleaned, rect });
    },
    []
  );

  const handleSentenceClick = useCallback(
    (index: number) => {
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
      <div className="flex items-center gap-3">
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

      {/* Story text */}
      <div className="bg-surface rounded-xl border border-border p-5 text-lg leading-relaxed">
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
                  className="cursor-pointer hover:bg-primary/10 rounded px-0.5 transition-colors"
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
