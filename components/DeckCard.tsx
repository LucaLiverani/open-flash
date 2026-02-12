"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DeckWithCounts } from "@/lib/db";
import { LANGUAGES, type LanguageCode } from "@/lib/db";

export default function DeckCard({ deck }: { deck: DeckWithCounts }) {
  const router = useRouter();
  const sourceName = LANGUAGES[deck.source_lang as LanguageCode] ?? deck.source_lang;
  const targetName = LANGUAGES[deck.target_lang as LanguageCode] ?? deck.target_lang;
  const [resetStep, setResetStep] = useState<0 | 1>(0);
  const [resetting, setResetting] = useState(false);

  return (
    <div className="bg-surface rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
      <Link href={`/decks/${deck.id}`}>
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl">{deck.emoji}</span>
          {deck.due_count > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-accent text-text rounded-full">
              {deck.due_count} due
            </span>
          )}
        </div>
        <h3 className="font-semibold text-lg mb-1">{deck.name}</h3>
        <p className="text-sm text-text-muted mb-3">
          {sourceName} → {targetName}
        </p>
        <p className="text-xs text-text-muted">
          {deck.card_count} {deck.card_count === 1 ? "card" : "cards"}
        </p>
      </Link>
      <div className="flex gap-2 mt-3">
        {deck.card_count > 0 && (
          <Link
            href={`/decks/${deck.id}/study`}
            className={`btn flex-1 ${deck.due_count > 0 ? "btn-primary" : "btn-ghost"}`}
          >
            {deck.due_count > 0 ? `Study (${deck.due_count} due)` : "Practice"}
          </Link>
        )}
        <button
          onClick={() => setResetStep(1)}
          className="btn btn-ghost text-danger text-xs"
        >
          Reset Study
        </button>
      </div>
      {resetStep === 1 && (
        <div className="mt-3 bg-danger/10 border border-danger/30 rounded-lg p-3 flex items-center gap-2">
          <p className="text-xs text-danger font-medium flex-1">Reset study progress?</p>
          <button
            onClick={async () => {
              setResetting(true);
              try {
                const res = await fetch(`/api/decks/${deck.id}/reset`, { method: "POST" });
                if (res.ok) {
                  setResetStep(0);
                  router.refresh();
                }
              } catch (error) {
                console.error("Failed to reset:", error);
              } finally {
                setResetting(false);
              }
            }}
            disabled={resetting}
            className="btn btn-danger text-xs"
          >
            {resetting ? "..." : "Yes"}
          </button>
          <button onClick={() => setResetStep(0)} className="btn btn-ghost text-xs">
            No
          </button>
        </div>
      )}
    </div>
  );
}
