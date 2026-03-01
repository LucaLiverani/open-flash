"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";

interface WordTooltipProps {
  word: string;
  rect: DOMRect;
  sourceLang: string;
  targetLang: string;
  onDismiss: () => void;
  onAddAsWord?: (word: string, translation: string) => void;
  onAddAsVerb?: (word: string) => void;
}

export default function WordTooltip({
  word,
  rect,
  sourceLang,
  targetLang,
  onDismiss,
  onAddAsWord,
  onAddAsVerb,
}: WordTooltipProps) {
  const [translation, setTranslation] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    below: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function translate() {
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: word,
            source: sourceLang,
            target: targetLang,
          }),
        });
        if (!res.ok) throw new Error("Translation failed");
        const data = (await res.json()) as { translation: string };
        if (!cancelled) setTranslation(data.translation);
      } catch {
        if (!cancelled) setTranslation("(error)");
      }
    }

    translate();
    return () => {
      cancelled = true;
    };
  }, [word, sourceLang, targetLang]);

  // Measure tooltip and clamp position within the viewport
  useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;

    const tooltipHeight = el.offsetHeight;
    const tooltipWidth = el.offsetWidth;
    const margin = 8;

    let top = rect.top - margin;
    let below = false;

    // If tooltip would overflow above the viewport, show below the word
    if (top - tooltipHeight < margin) {
      top = rect.bottom + margin;
      below = true;
    }

    // Center horizontally on the word, clamped to viewport edges
    let left = rect.left + rect.width / 2;
    const halfWidth = tooltipWidth / 2;
    left = Math.max(
      halfWidth + margin,
      Math.min(left, window.innerWidth - halfWidth - margin)
    );

    setPosition({ top, left, below });
  }, [rect, translation]);

  // Dismiss on click/touch outside, scroll, or Escape
  useEffect(() => {
    function handlePointerDown(e: Event) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        onDismiss();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }

    function handleScroll() {
      onDismiss();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, {
      passive: true,
      capture: true,
    });
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, [onDismiss]);

  const showActions = (onAddAsWord || onAddAsVerb) && translation && translation !== "(error)";

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 bg-surface border border-border rounded-lg shadow-lg px-3 py-2 text-sm max-w-52"
      style={{
        top: position?.top ?? rect.top - 8,
        left: position?.left ?? rect.left + rect.width / 2,
        transform: `translateX(-50%) ${position?.below ? "" : "translateY(-100%)"}`,
        opacity: position ? 1 : 0,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-text">{word}</p>
        <button
          onClick={onDismiss}
          className="text-text-muted hover:text-text transition-colors shrink-0 leading-none mt-0.5"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <p className="text-text-muted">
        {translation === null ? "..." : translation}
      </p>
      {showActions && (
        <div className="flex gap-1 mt-2">
          {onAddAsWord && (
            <button
              onClick={() => onAddAsWord(word, translation!)}
              className="flex-1 text-xs bg-surface-hover hover:bg-primary/10 text-text border border-border rounded px-2 py-1 transition-colors"
            >
              + word
            </button>
          )}
          {onAddAsVerb && (
            <button
              onClick={() => onAddAsVerb(word)}
              className="flex-1 text-xs bg-surface-hover hover:bg-primary/10 text-text border border-border rounded px-2 py-1 transition-colors"
            >
              + verb
            </button>
          )}
        </div>
      )}
    </div>
  );
}
