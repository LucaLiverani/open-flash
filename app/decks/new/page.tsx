"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LANGUAGES, type LanguageCode } from "@/lib/db";

const languageOptions = Object.entries(LANGUAGES) as [LanguageCode, string][];

export default function NewDeckPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📚");
  const [sourceLang, setSourceLang] = useState<LanguageCode>("en");
  const [targetLang, setTargetLang] = useState<LanguageCode>("es");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          emoji: emoji.trim() || "📚",
          source_lang: sourceLang,
          target_lang: targetLang,
        }),
      });
      if (res.ok) {
        const deck = await res.json() as { id: string };
        router.push(`/decks/${deck.id}`);
      }
    } catch (error) {
      console.error("Failed to create deck:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Deck</h1>
      <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Deck Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Spanish Basics"
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
        <div className="grid grid-cols-2 gap-4">
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
        <button
          type="submit"
          disabled={!name.trim() || loading}
          className="btn btn-primary btn-lg w-full"
        >
          {loading ? "Creating..." : "Create Deck"}
        </button>
      </form>
    </div>
  );
}
