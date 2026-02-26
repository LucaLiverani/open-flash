"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LANGUAGES, type LanguageCode } from "@/lib/db";

const languageOptions = Object.entries(LANGUAGES) as [LanguageCode, string][];

export default function NewVerbDeckPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📖");
  const [language, setLanguage] = useState<LanguageCode>("es");
  const [translationLang, setTranslationLang] = useState<LanguageCode>("en");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/verb-decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          emoji: emoji.trim() || "📖",
          language,
          translation_lang: translationLang,
        }),
      });
      if (res.ok) {
        const deck = await res.json() as { id: string };
        router.push(`/verbs/${deck.id}`);
      }
    } catch (error) {
      console.error("Failed to create verb deck:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Verb Deck</h1>
      <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Deck Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Spanish Verbs"
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
            <label className="block text-sm font-medium mb-1">I&apos;m studying</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
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
            <label className="block text-sm font-medium mb-1">I speak</label>
            <select
              value={translationLang}
              onChange={(e) => setTranslationLang(e.target.value as LanguageCode)}
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
          {loading ? "Creating..." : "Create Verb Deck"}
        </button>
      </form>
    </div>
  );
}
