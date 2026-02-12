"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { LANGUAGES, type LanguageCode } from "@/lib/db";
import type { Deck } from "@/lib/db";
import LoadingSpinner from "@/components/LoadingSpinner";

const languageOptions = Object.entries(LANGUAGES) as [LanguageCode, string][];

export default function EditDeckPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [sourceLang, setSourceLang] = useState<LanguageCode>("en");
  const [targetLang, setTargetLang] = useState<LanguageCode>("es");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/decks/${params.id}`);
        if (res.ok) {
          const data = await res.json() as Deck;
          setDeck(data);
          setName(data.name);
          setEmoji(data.emoji);
          setSourceLang(data.source_lang as LanguageCode);
          setTargetLang(data.target_lang as LanguageCode);
        } else {
          router.push("/decks");
        }
      } catch {
        router.push("/decks");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/decks/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          emoji: emoji.trim() || "📚",
          source_lang: sourceLang,
          target_lang: targetLang,
        }),
      });
      if (res.ok) {
        router.push(`/decks/${params.id}`);
      }
    } catch (error) {
      console.error("Failed to update deck:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this deck and all its cards? This cannot be undone.")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/decks/${params.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/decks");
      }
    } catch (error) {
      console.error("Failed to delete deck:", error);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <LoadingSpinner text="Loading deck..." />;
  if (!deck) return null;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Deck</h1>
      <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Deck Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Emoji</label>
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            className="input w-20 text-center text-xl"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">I speak</label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value as LanguageCode)}
              className="input"
            >
              {languageOptions.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">I&apos;m learning</label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value as LanguageCode)}
              className="input"
            >
              {languageOptions.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="btn btn-primary flex-1"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="btn btn-danger"
          >
            {deleting ? "..." : "Delete"}
          </button>
        </div>
      </form>

      {/* Reset progress */}
      <div className="bg-surface rounded-xl border border-border p-6 mt-4">
        <h3 className="font-semibold mb-2">Reset Study Progress</h3>
        <p className="text-sm text-text-muted mb-4">
          This resets all cards to &quot;new&quot; — intervals, repetitions, and ease factors go back to defaults. Cards are not deleted.
        </p>
        {resetStep === 0 && (
          <button
            onClick={() => setResetStep(1)}
            className="btn btn-danger"
          >
            Reset Progress
          </button>
        )}
        {resetStep === 1 && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-danger font-medium">Are you sure?</p>
            <button
              onClick={async () => {
                setResetStep(2);
                setResetting(true);
                try {
                  const res = await fetch(`/api/decks/${params.id}/reset`, {
                    method: "POST",
                  });
                  if (res.ok) {
                    setResetStep(0);
                    router.push(`/decks/${params.id}`);
                  }
                } catch (error) {
                  console.error("Failed to reset:", error);
                  setResetStep(0);
                } finally {
                  setResetting(false);
                }
              }}
              className="btn btn-danger"
            >
              Yes, reset everything
            </button>
            <button
              onClick={() => setResetStep(0)}
              className="btn btn-ghost"
            >
              Cancel
            </button>
          </div>
        )}
        {resetStep === 2 && resetting && (
          <p className="text-sm text-text-muted">Resetting...</p>
        )}
      </div>
    </div>
  );
}
