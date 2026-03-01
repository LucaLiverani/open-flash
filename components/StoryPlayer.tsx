"use client";

import { useState, useCallback, useRef } from "react";
import { useStoryPlayer } from "@/lib/useStoryPlayer";
import { useLongPressTooltip } from "@/lib/useLongPressTooltip";
import WordTooltip from "./WordTooltip";
import WordSpans from "./WordSpans";
import AddToVocabDeckModal from "./AddToVocabDeckModal";
import AddToVerbDeckModal from "./AddToVerbDeckModal";

interface StoryPlayerProps {
  title: string;
  sentences: string[];
  translation: string;
  language: string;
  nativeLang: string;
  onNewStory: () => void;
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

  // Modal state
  const [addWordModal, setAddWordModal] = useState<{
    word: string;
    translation: string;
    sentence: string;
  } | null>(null);
  const [addVerbModal, setAddVerbModal] = useState<{ word: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Tracks whether audio should resume when a modal is closed
  const wasPlayingForModal = useRef(false);

  const {
    tooltip,
    dismissTooltip,
    resumeAfterTooltip,
    wasPlayingBeforeTooltip,
    containerTouchHandlers,
    handleWordClick,
    handleSentenceClick,
  } = useLongPressTooltip({ isPlaying, pause, play, jumpTo });

  // Normal tooltip dismiss (× button, tap outside, escape, scroll) — resumes audio
  const handleDismissTooltip = useCallback(() => {
    dismissTooltip();
    resumeAfterTooltip();
  }, [dismissTooltip, resumeAfterTooltip]);

  function openWordModal(word: string, trans: string) {
    // Determine if audio was playing before this whole interaction
    wasPlayingForModal.current = wasPlayingBeforeTooltip.current || isPlaying;
    dismissTooltip(); // close tooltip without resuming audio
    if (isPlaying) pause(); // pause if still playing (desktop case)
    // Prefer the sentence the word was in (from DOM); fall back to active sentence
    const si = tooltip?.sentenceIndex ?? (activeSentenceIndex >= 0 ? activeSentenceIndex : undefined);
    setAddWordModal({
      word,
      translation: trans,
      sentence: si !== undefined ? sentences[si] : "",
    });
  }

  function openVerbModal(word: string) {
    wasPlayingForModal.current = wasPlayingBeforeTooltip.current || isPlaying;
    dismissTooltip();
    if (isPlaying) pause();
    setAddVerbModal({ word });
  }

  function handleModalClose(successMessage?: string) {
    setAddWordModal(null);
    setAddVerbModal(null);
    if (wasPlayingForModal.current) play();
    wasPlayingForModal.current = false;
    if (successMessage) {
      setToast(successMessage);
      setTimeout(() => setToast(null), 2500);
    }
  }

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
        {...containerTouchHandlers}
      >
        {sentences.map((sentence, sIndex) => (
          <span
            key={sIndex}
            data-sentence-index={sIndex}
            onClick={() => handleSentenceClick(sIndex)}
            className={`cursor-pointer rounded transition-colors ${
              sIndex === activeSentenceIndex
                ? "bg-primary/20"
                : "hover:bg-surface-hover"
            }`}
          >
            <WordSpans sentence={sentence} onWordClick={handleWordClick} />{" "}
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
          onDismiss={handleDismissTooltip}
          onAddAsWord={openWordModal}
          onAddAsVerb={openVerbModal}
        />
      )}

      {/* Add word modal */}
      {addWordModal && (
        <AddToVocabDeckModal
          word={addWordModal.word}
          translation={addWordModal.translation}
          exampleSentence={addWordModal.sentence}
          sourceLang={language}
          targetLang={nativeLang}
          onClose={handleModalClose}
        />
      )}

      {/* Add verb modal */}
      {addVerbModal && (
        <AddToVerbDeckModal
          word={addVerbModal.word}
          language={language}
          onClose={handleModalClose}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-lg px-4 py-2 text-sm text-text shadow-lg z-50 pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}
