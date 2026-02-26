"use client";

import { useState, useEffect, useRef } from "react";

interface WordTooltipProps {
  word: string;
  rect: DOMRect;
  sourceLang: string;
  targetLang: string;
  onDismiss: () => void;
}

export default function WordTooltip({
  word,
  rect,
  sourceLang,
  targetLang,
  onDismiss,
}: WordTooltipProps) {
  const [translation, setTranslation] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
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

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onDismiss]);

  const top = rect.top - 8;
  const left = rect.left + rect.width / 2;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 -translate-x-1/2 -translate-y-full bg-surface border border-border rounded-lg shadow-lg px-3 py-2 text-sm max-w-48"
      style={{ top, left }}
    >
      <p className="font-medium text-text">{word}</p>
      <p className="text-text-muted">
        {translation === null ? "..." : translation}
      </p>
    </div>
  );
}
