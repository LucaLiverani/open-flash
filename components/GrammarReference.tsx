"use client";

import { useState, useCallback } from "react";
import type { TenseGrammar } from "@/lib/db";

interface LanguageInfo {
  code: string;
  name: string;
  translationLang: string;
}

interface GrammarReferenceProps {
  languages: LanguageInfo[];
}

interface GrammarExample {
  sentence: string;
  translation: string;
}

export default function GrammarReference({ languages }: GrammarReferenceProps) {
  const [expandedLang, setExpandedLang] = useState<string | null>(null);
  const [expandedTense, setExpandedTense] = useState<string | null>(null);
  const [grammarByLang, setGrammarByLang] = useState<Record<string, TenseGrammar[]>>({});
  const [loading, setLoading] = useState<string | null>(null);

  const fetchGrammar = useCallback(async (lang: LanguageInfo) => {
    if (grammarByLang[lang.code]) return;
    setLoading(lang.code);
    try {
      const res = await fetch(
        `/api/verbs/grammar?language=${lang.code}&translation_lang=${lang.translationLang}`
      );
      if (res.ok) {
        const data = (await res.json()) as { grammar: TenseGrammar[] };
        setGrammarByLang((prev) => ({ ...prev, [lang.code]: data.grammar }));
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(null);
    }
  }, [grammarByLang]);

  const toggleLang = (lang: LanguageInfo) => {
    if (expandedLang === lang.code) {
      setExpandedLang(null);
      setExpandedTense(null);
    } else {
      setExpandedLang(lang.code);
      setExpandedTense(null);
      fetchGrammar(lang);
    }
  };

  if (languages.length === 0) return null;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Grammar Reference</h2>
      <div className="space-y-2">
        {languages.map((lang) => (
          <div key={lang.code}>
            <button
              onClick={() => toggleLang(lang)}
              className="w-full flex items-center justify-between bg-surface rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
            >
              <span className="font-semibold">{lang.name} Tenses</span>
              <span className="text-text-muted text-lg">
                {expandedLang === lang.code ? "−" : "+"}
              </span>
            </button>

            {expandedLang === lang.code && (
              <div className="mt-2 ml-2">
                {loading === lang.code ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : grammarByLang[lang.code] ? (
                  <div className="space-y-2">
                    {grammarByLang[lang.code].map((g) => {
                      const isOpen = expandedTense === `${lang.code}:${g.tense}`;
                      const examples = JSON.parse(g.examples) as GrammarExample[];
                      return (
                        <div
                          key={g.id}
                          className="bg-surface rounded-lg border border-border"
                        >
                          <button
                            onClick={() =>
                              setExpandedTense(
                                isOpen ? null : `${lang.code}:${g.tense}`
                              )
                            }
                            className="w-full flex items-center justify-between p-3 text-left"
                          >
                            <span className="font-medium text-primary text-sm uppercase tracking-wide">
                              {g.tense}
                            </span>
                            <span className="text-text-muted text-sm">
                              {isOpen ? "−" : "+"}
                            </span>
                          </button>

                          {isOpen && (
                            <div className="px-4 pb-4 space-y-3">
                              <p className="text-sm">{g.explanation}</p>

                              <div>
                                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
                                  When to use
                                </h4>
                                <p className="text-sm whitespace-pre-line">
                                  {g.when_to_use}
                                </p>
                              </div>

                              <div>
                                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
                                  Examples
                                </h4>
                                <div className="space-y-1.5">
                                  {examples.map((ex, i) => (
                                    <div key={i} className="text-sm">
                                      <span className="font-medium">
                                        {ex.sentence}
                                      </span>
                                      <span className="text-text-muted ml-2">
                                        — {ex.translation}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="bg-surface-hover rounded-lg p-3">
                                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
                                  Common mistakes
                                </h4>
                                <p className="text-sm">{g.common_mistakes}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
