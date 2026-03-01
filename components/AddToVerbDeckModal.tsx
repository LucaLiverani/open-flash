"use client";

import { useState, useEffect } from "react";
import type { VerbDeck } from "@/lib/db";
import type { ConjugationResult } from "@/lib/gemini";
import TenseSelector from "./TenseSelector";
import ConjugationTable from "./ConjugationTable";

interface AddToVerbDeckModalProps {
  word: string;
  language: string;
  translationLang?: string;
  onClose: (successMessage?: string) => void;
}

export default function AddToVerbDeckModal({
  word,
  language,
  translationLang,
  onClose,
}: AddToVerbDeckModalProps) {
  const [infinitive, setInfinitive] = useState("");
  const [isRegular, setIsRegular] = useState<boolean | null>(null);
  const [allTenses, setAllTenses] = useState<string[]>([]);
  const [selectedTenses, setSelectedTenses] = useState<string[]>([]);
  const [verbDecks, setVerbDecks] = useState<VerbDeck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [conjugation, setConjugation] = useState<ConjugationResult | null>(null);
  const [lemmatizing, setLemmatizing] = useState(true);
  const [conjugating, setConjugating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount: lemmatize + fetch tenses + fetch verb decks in parallel
  useEffect(() => {
    setLemmatizing(true);

    const lemmatizePromise = fetch("/api/verbs/lemmatize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, language }),
    })
      .then((r) => r.json() as Promise<{ infinitive: string; isRegular: boolean }>)
      .then((data) => {
        setInfinitive(data.infinitive);
        setIsRegular(data.isRegular);
        return data.infinitive;
      });

    const tensesPromise = fetch(`/api/verbs/tenses?language=${encodeURIComponent(language)}`)
      .then((r) => r.json() as Promise<{ all_tenses: string[]; selected_tenses: string[] }>)
      .then((data) => {
        setAllTenses(data.all_tenses);
        setSelectedTenses(data.selected_tenses);
        return data.selected_tenses;
      });

    const decksPromise = fetch("/api/verb-decks")
      .then((r) => r.json() as Promise<VerbDeck[]>)
      .then((all) => {
        const matching = all.filter((d) => d.language === language);
        setVerbDecks(matching);
        if (matching.length > 0) setSelectedDeckId(matching[0].id);
        return matching;
      });

    Promise.all([lemmatizePromise, tensesPromise, decksPromise])
      .then(([inf, tenses]) => {
        setLemmatizing(false);
        // Auto-conjugate once we have infinitive and tenses
        if (inf && tenses.length > 0) {
          autoConjugate(inf, tenses);
        }
      })
      .catch(() => {
        setError("Failed to load verb information");
        setLemmatizing(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function autoConjugate(inf: string, tenses: string[]) {
    if (!inf.trim() || tenses.length === 0) return;
    setConjugating(true);
    setError(null);
    try {
      const res = await fetch("/api/verbs/conjugate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verb: inf.trim(), language, tenses, targetLang: translationLang }),
      });
      if (!res.ok) throw new Error("Conjugation failed");
      const data = await res.json() as ConjugationResult;
      setConjugation(data);
      if (data.infinitive && data.infinitive !== inf) {
        setInfinitive(data.infinitive);
      }
    } catch {
      setError("Failed to conjugate verb");
    } finally {
      setConjugating(false);
    }
  }

  function handleReconjugate() {
    autoConjugate(infinitive, selectedTenses);
  }

  async function handleSave() {
    if (!conjugation || !selectedDeckId) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/verbs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conjugation,
          language,
          verb_deck_id: selectedDeckId,
        }),
      });
      if (!res.ok) throw new Error("Failed to save verb");

      const deckName = verbDecks.find((d) => d.id === selectedDeckId)?.name ?? "deck";
      onClose(`Added "${conjugation.infinitive}" to ${deckName}`);
    } catch {
      setError("Failed to save verb. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-surface rounded-xl border border-border shadow-xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text">Add verb to deck</h3>
          <button
            onClick={() => onClose()}
            className="text-text-muted hover:text-text transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {lemmatizing ? (
          <div className="text-sm text-text-muted animate-pulse py-4 text-center">
            Finding infinitive...
          </div>
        ) : (
          <>
            {/* Infinitive field */}
            <div>
              <label className="block text-xs text-text-muted mb-1">
                Infinitive
                <span className="text-text-muted/60 ml-1">(inferred from &ldquo;{word}&rdquo;)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={infinitive}
                  onChange={(e) => setInfinitive(e.target.value)}
                  className="input flex-1"
                  placeholder="Infinitive form"
                />
                <button
                  onClick={handleReconjugate}
                  disabled={conjugating || !infinitive.trim() || selectedTenses.length === 0}
                  className="btn btn-secondary text-sm shrink-0"
                >
                  {conjugating ? "..." : "Conjugate"}
                </button>
              </div>
            </div>

            {/* Regular / irregular badge */}
            {isRegular !== null && (
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    isRegular
                      ? "bg-green-500/10 text-green-600 border-green-500/30"
                      : "bg-orange-500/10 text-orange-600 border-orange-500/30"
                  }`}
                >
                  {isRegular ? "Regular verb" : "Irregular verb"}
                </span>
              </div>
            )}

            {/* Tense selector */}
            {allTenses.length > 0 && (
              <div>
                <label className="block text-xs text-text-muted mb-1">Tenses</label>
                <TenseSelector
                  allTenses={allTenses}
                  selectedTenses={selectedTenses}
                  onChange={setSelectedTenses}
                />
              </div>
            )}

            {/* Verb deck picker */}
            {verbDecks.length === 0 ? (
              <p className="text-sm text-text-muted">
                No verb decks found for this language. Create one first.
              </p>
            ) : (
              <div>
                <label className="block text-xs text-text-muted mb-1">Verb deck</label>
                <select
                  value={selectedDeckId}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  className="input w-full"
                >
                  {verbDecks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.emoji} {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Conjugation preview */}
            {conjugating && (
              <p className="text-sm text-text-muted animate-pulse">Conjugating...</p>
            )}
            {conjugation && !conjugating && (
              <div>
                <p className="text-xs text-text-muted mb-2">
                  Preview: <span className="font-medium text-text">{conjugation.infinitive}</span>
                  {conjugation.meaning ? ` — ${conjugation.meaning}` : ""}
                </p>
                <ConjugationTable tenses={conjugation.tenses} language={language} />
              </div>
            )}
          </>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={() => onClose()}
            className="btn btn-secondary text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !conjugation || !selectedDeckId || lemmatizing}
            className="btn btn-primary text-sm"
          >
            {saving ? "Saving..." : "Save verb"}
          </button>
        </div>
      </div>
    </div>
  );
}
