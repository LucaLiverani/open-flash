import { useState, useCallback, useRef } from "react";

interface TooltipState {
  word: string;
  rect: DOMRect;
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

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      longPressTriggered.current = false;
      const target = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-word]"
      );
      longPressTimer.current = setTimeout(() => {
        longPressTriggered.current = true;
        if (isPlaying) pause();
        if (target) {
          const word = target.dataset.word!;
          const rect = target.getBoundingClientRect();
          setTooltip({ word, rect });
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
    if (longPressTriggered.current) {
      play();
      setTooltip(null);
    }
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
      const cleaned = word.replace(/[.,;:!?"""''()[\]{}¡¿«»]/g, "").trim();
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

  const dismissTooltip = useCallback(() => setTooltip(null), []);

  return {
    tooltip,
    dismissTooltip,
    containerTouchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onTouchMove: handleTouchMove,
    },
    handleWordClick,
    handleSentenceClick,
  };
}
