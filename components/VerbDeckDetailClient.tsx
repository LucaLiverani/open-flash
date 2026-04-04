"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { VerbDeck, SavedVerb, TenseGrammar } from "@/lib/db";
import { LANGUAGES, type LanguageCode } from "@/lib/db";
import type { ConjugationResult, ConjugationTense } from "@/lib/gemini";
import ConjugationTable from "./ConjugationTable";
import TenseSelector from "./TenseSelector";

interface VerbDeckDetailClientProps {
  deck: VerbDeck;
  initialVerbs: SavedVerb[];
  dueCount: number;
}

export default function VerbDeckDetailClient({
  deck,
  initialVerbs,
  dueCount,
}: VerbDeckDetailClientProps) {
  const router = useRouter();
  const [verbs, setVerbs] = useState<SavedVerb[]>(initialVerbs);
  const [resetStep, setResetStep] = useState<0 | 1>(0);
  const [resetting, setResetting] = useState(false);
  const [editingVerbId, setEditingVerbId] = useState<string | null>(null);
  const [expandedVerbId, setExpandedVerbId] = useState<string | null>(null);
  const [editMeaning, setEditMeaning] = useState("");
  const [editTenses, setEditTenses] = useState<ConjugationTense[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [translating, setTranslating] = useState(false);

  // Batch conjugation state
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; verb: string } | null>(null);

  // Conjugation state
  const [allTenses, setAllTenses] = useState<string[]>([]);
  const [selectedTenses, setSelectedTenses] = useState<string[]>([]);
  const [verb, setVerb] = useState("");
  const [result, setResult] = useState<ConjugationResult | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tensesLoading, setTensesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Grammar data
  const [grammarData, setGrammarData] = useState<Record<string, TenseGrammar>>({});

  // View filter for saved verbs (separate from conjugation tenses)
  const [viewTenses, setViewTenses] = useState<string[]>([]);

  const langName = LANGUAGES[deck.language as LanguageCode] ?? deck.language;
  const translationName = LANGUAGES[deck.translation_lang as LanguageCode] ?? deck.translation_lang;

  const fetchVerbs = useCallback(async () => {
    try {
      const res = await fetch(`/api/verbs?verb_deck_id=${deck.id}`);
      if (res.ok) {
        const data = await res.json() as SavedVerb[];
        setVerbs(data);
      }
    } catch (err) {
      console.error("Failed to fetch verbs:", err);
    }
  }, [deck.id]);

  // Load tenses for the deck's language
  useEffect(() => {
    (async () => {
      setTensesLoading(true);
      try {
        const res = await fetch(`/api/verbs/tenses?language=${deck.language}`);
        if (!res.ok) throw new Error("Failed to load tenses");
        const data = await res.json() as { all_tenses: string[]; selected_tenses: string[] };
        setAllTenses(data.all_tenses);
        setSelectedTenses(data.selected_tenses);
        setViewTenses(data.all_tenses);
      } catch {
        setError("Failed to load tenses for this language");
      } finally {
        setTensesLoading(false);
      }
    })();
  }, [deck.language]);

  // Load grammar data for this language
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `/api/verbs/grammar?language=${deck.language}&translation_lang=${deck.translation_lang}`
        );
        if (res.ok) {
          const data = (await res.json()) as { grammar: TenseGrammar[] };
          const map: Record<string, TenseGrammar> = {};
          for (const g of data.grammar) map[g.tense] = g;
          setGrammarData(map);
        }
      } catch {
        // Grammar is optional, don't block on errors
      }
    })();
  }, [deck.language, deck.translation_lang]);

  const handleTenseChange = async (selected: string[]) => {
    setSelectedTenses(selected);
    try {
      await fetch("/api/verbs/tenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: deck.language, selected_tenses: selected }),
      });
    } catch {
      // Persist silently fails — local state is still updated
    }
  };

  const handleConjugate = async () => {
    if (!verb.trim() || selectedTenses.length === 0) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSavedId(null);

    try {
      const res = await fetch("/api/verbs/conjugate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verb: verb.trim(),
          language: deck.language,
          tenses: selectedTenses,
          targetLang: deck.translation_lang,
        }),
      });

      if (!res.ok) throw new Error("Failed to conjugate verb");

      const data = await res.json() as ConjugationResult & { savedId?: string };
      if (data.savedId) {
        setSavedId(data.savedId);
      }
      setResult(data);
    } catch {
      setError("Failed to conjugate verb. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result || !result.isVerb) return;

    try {
      const res = await fetch("/api/verbs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conjugation: result,
          language: deck.language,
          verb_deck_id: deck.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to save verb");

      const saved = await res.json() as SavedVerb;
      setSavedId(saved.id);
      setVerbs((prev) => [saved, ...prev.filter((v) => v.id !== saved.id)]);
    } catch {
      setError("Failed to save verb");
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await fetch(`/api/verbs/${id}`, { method: "DELETE" });
      setVerbs((prev) => prev.filter((v) => v.id !== id));
      if (savedId === id) setSavedId(null);
    } catch {
      setError("Failed to remove verb");
    }
  };

  function startEditingVerb(verb: SavedVerb) {
    const conj = JSON.parse(verb.conjugations) as ConjugationResult;
    setEditingVerbId(verb.id);
    setExpandedVerbId(null);
    setEditMeaning(verb.meaning);
    setEditTenses(conj.tenses);
  }

  async function handleTranslate(infinitive: string) {
    setTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: infinitive,
          source: deck.language,
          target: deck.translation_lang,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { translation: string };
        setEditMeaning(data.translation);
      }
    } catch {
      setError("Failed to translate verb");
    } finally {
      setTranslating(false);
    }
  }

  async function handleSaveEdit(verbId: string) {
    setEditLoading(true);
    try {
      const tenseNames = editTenses.map((t) => t.tense);
      const res = await fetch(`/api/verbs/${verbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meaning: editMeaning.trim(),
          tenses: tenseNames,
          editedTenses: editTenses,
        }),
      });
      if (res.ok) {
        const updated = (await res.json()) as SavedVerb;
        setVerbs((prev) => prev.map((v) => (v.id === verbId ? updated : v)));
        setEditingVerbId(null);
      }
    } catch {
      setError("Failed to update verb");
    } finally {
      setEditLoading(false);
    }
  }

  const handleConjugateAll = async () => {
    if (selectedTenses.length === 0 || verbs.length === 0) return;

    const total = verbs.length;
    let updatedVerbs = [...verbs];

    for (let i = 0; i < verbs.length; i++) {
      const v = verbs[i];
      setBatchProgress({ current: i + 1, total, verb: v.infinitive });

      try {
        const res = await fetch(`/api/verbs/${v.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenses: selectedTenses }),
        });
        if (res.ok) {
          const updated = (await res.json()) as SavedVerb;
          updatedVerbs = updatedVerbs.map((uv) => (uv.id === v.id ? updated : uv));
        }
      } catch {
        // Continue with next verb on error
      }
    }

    setVerbs(updatedVerbs);
    setBatchProgress(null);
  };

  const displayedTenses = result?.tenses.filter((t) =>
    selectedTenses.includes(t.tense)
  ) ?? [];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">{deck.emoji}</span>
            <h1 className="text-2xl font-bold">{deck.name}</h1>
          </div>
          <p className="text-text-muted text-sm">
            {langName} → {translationName} &middot; {verbs.length} verbs
            {dueCount > 0 && (
              <span className="ml-2 text-accent font-medium">
                {dueCount} due
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {verbs.length > 0 && (
            <Link
              href={`/verbs/${deck.id}/study`}
              className={`btn ${dueCount > 0 ? "btn-primary" : "btn-ghost"}`}
            >
              {dueCount > 0 ? `Study (${dueCount} due)` : "Practice"}
            </Link>
          )}
          {verbs.length > 0 && selectedTenses.length > 0 && (
            <button
              onClick={handleConjugateAll}
              disabled={!!batchProgress}
              className="btn btn-ghost"
            >
              {batchProgress
                ? `Conjugating ${batchProgress.current}/${batchProgress.total}...`
                : "Conjugate All"}
            </button>
          )}
          <button
            onClick={() => setResetStep(1)}
            className="btn btn-ghost text-danger"
          >
            Reset Study
          </button>
        </div>
      </div>

      {/* Batch conjugation progress */}
      {batchProgress && (
        <div className="mb-6 bg-primary/10 border border-primary/30 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">
              Conjugating <strong>{batchProgress.verb}</strong> ({batchProgress.current}/{batchProgress.total})
            </p>
          </div>
          <div className="w-full bg-border rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Reset progress */}
      {resetStep === 1 && (
        <div className="flex items-center gap-3 mb-6 bg-danger/10 border border-danger/30 rounded-xl p-4">
          <p className="text-sm text-danger font-medium flex-1">
            Reset all study progress? Verbs will be kept but all intervals and repetitions go back to zero.
          </p>
          <button
            onClick={async () => {
              setResetting(true);
              try {
                const res = await fetch(`/api/verb-decks/${deck.id}/reset`, { method: "POST" });
                if (res.ok) {
                  setResetStep(0);
                  router.refresh();
                }
              } catch (err) {
                console.error("Failed to reset:", err);
              } finally {
                setResetting(false);
              }
            }}
            disabled={resetting}
            className="btn btn-danger"
          >
            {resetting ? "Resetting..." : "Yes, reset"}
          </button>
          <button onClick={() => setResetStep(0)} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      )}

      {/* Conjugation section */}
      <div className="mb-8">
        <h2 className="font-semibold mb-3">Conjugate</h2>

        {/* Tense selector */}
        <div className="mb-4">
          {tensesLoading ? (
            <div className="input flex items-center text-text-muted text-sm">
              Loading tenses...
            </div>
          ) : allTenses.length > 0 ? (
            <TenseSelector
              allTenses={allTenses}
              selectedTenses={selectedTenses}
              onChange={handleTenseChange}
            />
          ) : null}
        </div>

        {/* Verb input */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={verb}
            onChange={(e) => setVerb(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConjugate();
            }}
            placeholder="Enter a verb..."
            className="input flex-1"
          />
          <button
            onClick={handleConjugate}
            disabled={loading || !verb.trim() || selectedTenses.length === 0}
            className="btn btn-primary whitespace-nowrap"
          >
            {loading ? "..." : "Conjugate"}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 mb-4 text-danger text-sm">
            {error}
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="mb-4">
            {result.isVerb ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xl font-bold">{result.infinitive}</span>
                    <span className="text-text-muted ml-2">{result.meaning}</span>
                  </div>
                  {savedId ? (
                    <button
                      onClick={() => handleRemove(savedId)}
                      className="btn btn-ghost text-sm"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={handleSave}
                      className="btn btn-primary text-sm"
                    >
                      Save
                    </button>
                  )}
                </div>

                {result.note && (
                  <p className="text-text-muted text-sm mb-4 italic">
                    {result.note}
                  </p>
                )}

                <ConjugationTable
                  tenses={displayedTenses}
                  editable
                  grammarData={grammarData}
                  onChange={(updated) =>
                    setResult((prev) =>
                      prev ? { ...prev, tenses: prev.tenses.map((t) => updated.find((u) => u.tense === t.tense) ?? t) } : prev
                    )
                  }
                />
              </>
            ) : (
              <div className="bg-surface rounded-xl border border-border p-6 text-center">
                <p className="text-lg font-medium mb-1">Not a verb</p>
                <p className="text-text-muted text-sm">
                  &quot;{verb}&quot; doesn&apos;t appear to be a verb in{" "}
                  {langName}.
                </p>
                {result.note && (
                  <p className="text-text-muted text-sm mt-2 italic">
                    {result.note}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Saved verbs */}
      <div>
        <div className="flex flex-col gap-3 mb-3">
          <h2 className="font-semibold">
            Saved Verbs{verbs.length > 0 ? ` (${verbs.length})` : ""}
          </h2>
          {verbs.length > 0 && allTenses.length > 0 && (
            <TenseSelector
              allTenses={allTenses}
              selectedTenses={viewTenses}
              onChange={setViewTenses}
            />
          )}
        </div>
        {verbs.length === 0 ? (
          <p className="text-text-muted text-sm">
            No saved verbs yet. Conjugate a verb and save it for quick access.
          </p>
        ) : (
          <div className="space-y-2">
            {verbs.map((v) => (
              <div
                key={v.id}
                className="bg-surface rounded-lg border border-border p-3"
              >
                {editingVerbId === v.id ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold">{v.infinitive}</span>
                    </div>
                    <div>
                      <label className="block text-sm text-text-muted mb-1">Meaning</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editMeaning}
                          onChange={(e) => setEditMeaning(e.target.value)}
                          className="input flex-1"
                        />
                        <button
                          onClick={() => handleTranslate(v.infinitive)}
                          disabled={translating}
                          className="btn btn-ghost text-sm whitespace-nowrap"
                          title={`Translate to ${translationName}`}
                        >
                          {translating ? "..." : "Translate"}
                        </button>
                      </div>
                    </div>
                    <ConjugationTable
                      tenses={editTenses}
                      language={deck.language}
                      editable
                      grammarData={grammarData}
                      onChange={setEditTenses}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(v.id)}
                        disabled={editLoading}
                        className="btn btn-primary"
                      >
                        {editLoading ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingVerbId(null)}
                        className="btn btn-ghost"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => setExpandedVerbId(expandedVerbId === v.id ? null : v.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{v.infinitive}</span>
                        <span className="text-text-muted text-sm ml-2">{v.meaning}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); startEditingVerb(v); }}
                          className="text-text-muted hover:text-accent transition-colors text-sm"
                          title="Edit verb"
                        >
                          ✎
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemove(v.id); }}
                          className="text-text-muted hover:text-danger transition-colors text-sm"
                          title="Remove verb"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                    {expandedVerbId === v.id && (
                      <div className="mt-3">
                        <ConjugationTable
                          tenses={(JSON.parse(v.conjugations) as ConjugationResult).tenses.filter(
                            (t) => viewTenses.includes(t.tense)
                          )}
                          language={deck.language}
                          grammarData={grammarData}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
