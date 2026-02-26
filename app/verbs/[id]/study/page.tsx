"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import type { VerbDeck } from "@/lib/db";

interface TenseInfo {
  tense: string;
  totalCount: number;
  dueCount: number;
}

export default function VerbDeckStudyLauncher() {
  const router = useRouter();
  const params = useParams();
  const deckId = params.id as string;

  const [deck, setDeck] = useState<VerbDeck | null>(null);
  const [tenses, setTenses] = useState<string[]>([]);
  const [selectedTense, setSelectedTense] = useState<string>("");
  const [tenseInfo, setTenseInfo] = useState<TenseInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [tenseLoading, setTenseLoading] = useState(false);
  const [deckLoading, setDeckLoading] = useState(true);

  // Load deck info
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/verb-decks/${deckId}`);
        if (!res.ok) throw new Error("Failed to load deck");
        const data = await res.json() as VerbDeck;
        setDeck(data);
      } catch {
        // Non-critical for rendering
      } finally {
        setDeckLoading(false);
      }
    })();
  }, [deckId]);

  // Load available tenses for language
  const loadTenses = useCallback(async (lang: string) => {
    setTenseLoading(true);
    setSelectedTense("");
    setTenseInfo(null);
    try {
      const res = await fetch(`/api/verbs/tenses?language=${lang}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { all_tenses: string[]; selected_tenses: string[] };
      setTenses(data.selected_tenses.length > 0 ? data.selected_tenses : data.all_tenses);
    } catch {
      setTenses([]);
    } finally {
      setTenseLoading(false);
    }
  }, []);

  useEffect(() => {
    if (deck) {
      loadTenses(deck.language);
    }
  }, [deck, loadTenses]);

  // When a tense is selected, fetch due counts
  useEffect(() => {
    if (!selectedTense || !deck) {
      setTenseInfo(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const [savedRes, dueRes] = await Promise.all([
          fetch(`/api/verbs?verb_deck_id=${deckId}`),
          fetch(`/api/verbs/study/due?verb_deck_id=${deckId}&tense=${encodeURIComponent(selectedTense)}`),
        ]);

        if (cancelled) return;

        const savedVerbs = savedRes.ok ? await savedRes.json() as unknown[] : [];
        const dueVerbs = dueRes.ok ? await dueRes.json() as unknown[] : [];

        setTenseInfo({
          tense: selectedTense,
          totalCount: savedVerbs.length,
          dueCount: dueVerbs.length,
        });
      } catch {
        if (!cancelled) setTenseInfo(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedTense, deckId, deck]);

  const startSession = (mode: "due" | "practice") => {
    const params = new URLSearchParams({
      tense: selectedTense,
      mode,
      ...(deck ? { tlang: deck.translation_lang } : {}),
    });
    router.push(`/verbs/${deckId}/study/session?${params.toString()}`);
  };

  if (deckLoading) {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Study Verbs</h1>
        <Link href={`/verbs/${deckId}`} className="btn btn-ghost text-sm">
          Back to Deck
        </Link>
      </div>

      {deck && (
        <div className="flex items-center gap-3 mb-6 bg-surface rounded-xl border border-border p-4">
          <span className="text-2xl">{deck.emoji}</span>
          <div>
            <p className="font-semibold">{deck.name}</p>
            <p className="text-sm text-text-muted">
              {deck.language} → {deck.translation_lang}
            </p>
          </div>
        </div>
      )}

      {/* Tense selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1 text-text-muted">Tense</label>
        {tenseLoading ? (
          <div className="input flex items-center text-text-muted text-sm">
            Loading tenses...
          </div>
        ) : tenses.length > 0 ? (
          <select
            value={selectedTense}
            onChange={(e) => setSelectedTense(e.target.value)}
            className="input w-full"
          >
            <option value="">Select a tense...</option>
            {tenses.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-text-muted">No tenses available. Try conjugating some verbs first.</p>
        )}
      </div>

      {/* Info and actions */}
      {loading && selectedTense && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {tenseInfo && !loading && (
        <div className="bg-surface rounded-xl border border-border p-6">
          {tenseInfo.totalCount === 0 ? (
            <div className="text-center">
              <p className="text-text-muted mb-2">
                No saved verbs with this tense.
              </p>
              <Link href={`/verbs/${deckId}`} className="text-primary text-sm hover:underline">
                Save some verbs first
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{tenseInfo.totalCount}</p>
                  <p className="text-xs text-text-muted">Saved verbs</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{tenseInfo.dueCount}</p>
                  <p className="text-xs text-text-muted">Due for review</p>
                </div>
              </div>

              <div className="flex gap-3">
                {tenseInfo.dueCount > 0 && (
                  <button
                    onClick={() => startSession("due")}
                    className="btn btn-primary flex-1"
                  >
                    Review Due ({tenseInfo.dueCount})
                  </button>
                )}
                <button
                  onClick={() => startSession("practice")}
                  className={`btn flex-1 ${tenseInfo.dueCount > 0 ? "btn-ghost" : "btn-primary"}`}
                >
                  Practice All
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
