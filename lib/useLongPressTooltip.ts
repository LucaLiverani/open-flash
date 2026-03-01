import { useState, useCallback, useRef } from "react";

interface TooltipState {
  word: string;
  rect: DOMRect;
  sentenceIndex?: number;
}

interface UseLongPressTooltipOptions {
  isPlaying: boolean;
  pause: () => void;
  play: () => void;
  jumpTo: (index: number) => void;
}

export function useLongPressTooltip({
  isPlaying,
  pause,
  play,
  jumpTo,
}: UseLongPressTooltipOptions) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  // Tracks whether audio was playing when a long-press opened the tooltip
  const wasPlayingBeforeTooltip = useRef(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      longPressTriggered.current = false;
      const target = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-word]"
      );
      longPressTimer.current = setTimeout(() => {
        longPressTriggered.current = true;
        wasPlayingBeforeTooltip.current = isPlaying;
        if (isPlaying) pause();
        if (target) {
          const word = target.dataset.word!;
          const rect = target.getBoundingClientRect();
          const sentenceEl = target.closest<HTMLElement>("[data-sentence-index]");
          const sentenceIndex = sentenceEl ? parseInt(sentenceEl.dataset.sentenceIndex!, 10) : undefined;
          setTooltip({ word, rect, sentenceIndex });
        }
      }, 500);
    },
    [isPlaying, pause]
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Tooltip stays open after finger lift so the user can tap the action buttons.
    // Audio resumes when the tooltip is explicitly dismissed via dismissTooltip.
  }, []);

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
      const cleaned = word.replace(/[.,;:!?"""''()[\]{}¡¿«»]/g, "").trim();
      if (!cleaned) return;
      wasPlayingBeforeTooltip.current = false; // desktop click doesn't pause audio
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const sentenceEl = (e.target as HTMLElement).closest<HTMLElement>("[data-sentence-index]");
      const sentenceIndex = sentenceEl ? parseInt(sentenceEl.dataset.sentenceIndex!, 10) : undefined;
      setTooltip({ word: cleaned, rect, sentenceIndex });
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

  const dismissTooltip = useCallback(() => {
    setTooltip(null);
    longPressTriggered.current = false;
  }, []);

  // Resume audio if it was paused by the long-press that opened the tooltip.
  // Call this when the tooltip is dismissed without opening a modal (e.g. × button, tap outside).
  const resumeAfterTooltip = useCallback(() => {
    if (wasPlayingBeforeTooltip.current) {
      play();
      wasPlayingBeforeTooltip.current = false;
    }
  }, [play]);

  return {
    tooltip,
    dismissTooltip,
    resumeAfterTooltip,
    wasPlayingBeforeTooltip,
    containerTouchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onTouchMove: handleTouchMove,
    },
    handleWordClick,
    handleSentenceClick,
  };
}
