"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useBookPlayer, type PlaybackSpeed } from "@/lib/useBookPlayer";
import { useLongPressTooltip } from "@/lib/useLongPressTooltip";
import WordTooltip from "./WordTooltip";
import WordSpans from "./WordSpans";
import type { BookChapter } from "@/lib/books";

interface BookReaderProps {
  bookSlug: string;
  chapter: BookChapter;
  totalChapters: number;
  initialSentenceIndex: number;
  language: string;
  defaultTargetLang: string;
}

const TRANSLATION_LANGS = [
  { code: "it", label: "Italiano" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
];

const SPEEDS: PlaybackSpeed[] = [0.75, 1, 1.25];

export default function BookReader({
  bookSlug,
  chapter,
  totalChapters,
  initialSentenceIndex,
  language,
  defaultTargetLang,
}: BookReaderProps) {
  const sentences = useMemo(
    () => chapter.sentences.map((s) => s.text),
    [chapter.sentences]
  );
  const [targetLang, setTargetLang] = useState(defaultTargetLang);
  const [translations, setTranslations] = useState<string[]>([]);
  const [translationsLoading, setTranslationsLoading] = useState(false);

  const sentenceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const progressSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save progress (debounced)
  const saveProgress = useCallback(
    (sentenceIndex: number) => {
      if (progressSaveTimer.current) {
        clearTimeout(progressSaveTimer.current);
      }
      progressSaveTimer.current = setTimeout(() => {
        const completed = sentenceIndex >= sentences.length - 1;
        fetch("/api/shadowing/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            book_slug: bookSlug,
            chapter_number: chapter.number,
            sentence_index: sentenceIndex,
            completed,
          }),
        }).catch(() => {});
      }, 1000);
    },
    [bookSlug, chapter.number, sentences.length]
  );

  const handleSentenceChange = useCallback(
    (index: number) => {
      saveProgress(index);
      // Auto-scroll to active sentence
      const el = sentenceRefs.current[index];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [saveProgress]
  );

  const {
    activeSentenceIndex,
    isPlaying,
    playbackSpeed,
    play,
    pause,
    jumpTo,
    stop,
    setPlaybackSpeed,
  } = useBookPlayer(sentences, language, handleSentenceChange);

  // Fetch translations when chapter or target language changes
  useEffect(() => {
    // Check for pre-computed translations first
    const precomputed = chapter.sentences.map(
      (s) => s.translations?.[targetLang]
    );
    if (precomputed.every((t) => !!t)) {
      setTranslations(precomputed as string[]);
      setTranslationsLoading(false);
      return;
    }

    // Fall back to API fetch for non-precomputed languages
    let cancelled = false;
    setTranslationsLoading(true);

    fetch("/api/shadowing/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sentences,
        sourceLang: language,
        targetLang,
        bookSlug,
        chapter: chapter.number,
      }),
    })
      .then((res) => res.json() as Promise<{ translations: string[] }>)
      .then((data) => {
        if (!cancelled) {
          setTranslations(data.translations ?? []);
          setTranslationsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setTranslationsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chapter.sentences, language, targetLang, bookSlug, chapter.number]);

  // Jump to saved position on mount
  useEffect(() => {
    if (initialSentenceIndex > 0) {
      const el = sentenceRefs.current[initialSentenceIndex];
      if (el) {
        el.scrollIntoView({ behavior: "instant", block: "center" });
      }
    }
  }, [initialSentenceIndex]);

  const {
    tooltip,
    dismissTooltip,
    containerTouchHandlers,
    handleWordClick,
    handleSentenceClick,
  } = useLongPressTooltip({ isPlaying, pause, play, jumpTo });

  const prevChapter = chapter.number > 1 ? chapter.number - 1 : null;
  const nextChapter =
    chapter.number < totalChapters ? chapter.number + 1 : null;

  return (
    <div className="space-y-4">
      {/* Chapter title */}
      <h2 className="text-lg font-bold text-text">
        Capítulo {chapter.number}: {chapter.title}
      </h2>

      {/* Controls bar */}
      <div className="flex items-center flex-wrap gap-3">
        {/* Play / Pause */}
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

        {/* Prev / Next sentence */}
        <button
          onClick={() =>
            jumpTo(Math.max(0, activeSentenceIndex - 1))
          }
          disabled={activeSentenceIndex <= 0}
          className="btn btn-secondary text-sm px-2"
          title="Previous sentence"
        >
          ←
        </button>
        <button
          onClick={() =>
            jumpTo(
              Math.min(sentences.length - 1, activeSentenceIndex + 1)
            )
          }
          disabled={activeSentenceIndex >= sentences.length - 1}
          className="btn btn-secondary text-sm px-2"
          title="Next sentence"
        >
          →
        </button>

        {/* Speed selector */}
        <select
          value={playbackSpeed}
          onChange={(e) =>
            setPlaybackSpeed(Number(e.target.value) as PlaybackSpeed)
          }
          className="bg-surface border border-border rounded px-2 py-1.5 text-sm text-text"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>

        {/* Translation language */}
        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="ml-auto bg-surface border border-border rounded px-2 py-1.5 text-sm text-text"
        >
          {TRANSLATION_LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {/* Translation loading indicator */}
      {translationsLoading && (
        <p className="text-sm text-text-muted animate-pulse">
          Loading translations...
        </p>
      )}

      {/* Sentence list */}
      <div
        className="space-y-3"
        {...containerTouchHandlers}
      >
        {sentences.map((sentence, sIndex) => (
          <div
            key={sIndex}
            ref={(el) => {
              sentenceRefs.current[sIndex] = el;
            }}
            onClick={() => handleSentenceClick(sIndex)}
            className={`rounded-lg border p-3 cursor-pointer transition-colors select-none ${
              sIndex === activeSentenceIndex
                ? "bg-primary/15 border-primary/40"
                : "bg-surface border-border hover:bg-surface-hover"
            }`}
          >
            {/* Text with word-level spans */}
            <p className="text-base leading-relaxed">
              <WordSpans sentence={sentence} onWordClick={handleWordClick} />
            </p>

            {/* Translation */}
            {translations[sIndex] && (
              <p className="text-sm text-text-muted mt-1.5 leading-relaxed">
                {translations[sIndex]}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Chapter navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        {prevChapter ? (
          <a
            href={`/shadowing/${bookSlug}/${prevChapter}`}
            className="btn btn-secondary text-sm"
            onClick={stop}
          >
            ← Chapter {prevChapter}
          </a>
        ) : (
          <div />
        )}
        {nextChapter ? (
          <a
            href={`/shadowing/${bookSlug}/${nextChapter}`}
            className="btn btn-secondary text-sm"
            onClick={stop}
          >
            Chapter {nextChapter} →
          </a>
        ) : (
          <div />
        )}
      </div>

      {/* Word tooltip */}
      {tooltip && (
        <WordTooltip
          word={tooltip.word}
          rect={tooltip.rect}
          sourceLang={language}
          targetLang={targetLang}
          onDismiss={dismissTooltip}
        />
      )}
    </div>
  );
}
