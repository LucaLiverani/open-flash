"use client";

import { useState, useCallback } from "react";
import type { ConjugationTense } from "@/lib/gemini";
import { useSpeech } from "@/lib/useSpeech";
import SpeakButton from "@/components/SpeakButton";

interface ConjugationTableProps {
  tenses: ConjugationTense[];
  language?: string;
  editable?: boolean;
  onChange?: (tenses: ConjugationTense[]) => void;
}

export default function ConjugationTable({ tenses, language, editable, onChange }: ConjugationTableProps) {
  const { speak, isSpeaking, isSupported } = useSpeech();
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);

  const handleSpeak = useCallback((text: string, key: string) => {
    if (!language) return;
    setSpeakingKey(key);
    speak(text, language);
  }, [language, speak]);

  const updateConjugation = useCallback((tenseIdx: number, formIdx: number, value: string) => {
    if (!onChange) return;
    const updated = tenses.map((t, ti) =>
      ti === tenseIdx
        ? { ...t, forms: t.forms.map((f, fi) => (fi === formIdx ? { ...f, conjugation: value } : f)) }
        : t
    );
    onChange(updated);
  }, [tenses, onChange]);

  const updateExampleSentence = useCallback((tenseIdx: number, value: string) => {
    if (!onChange) return;
    const updated = tenses.map((t, ti) =>
      ti === tenseIdx ? { ...t, exampleSentence: value } : t
    );
    onChange(updated);
  }, [tenses, onChange]);

  if (tenses.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {tenses.map((t, tenseIdx) => (
        <div
          key={t.tense}
          className="bg-surface rounded-xl border border-border p-4"
        >
          <h3 className="font-semibold text-primary mb-3 text-sm uppercase tracking-wide">
            {t.tense}
          </h3>
          <div className="space-y-1.5">
            {t.forms.map((f, i) => {
              const key = `${t.tense}-${i}`;
              return (
                <div
                  key={i}
                  className="flex justify-between items-center text-sm py-1 px-2 rounded hover:bg-surface-hover transition-colors"
                >
                  <span className="text-text-muted">{f.person}</span>
                  <div className="flex items-center gap-1">
                    {editable ? (
                      <input
                        type="text"
                        value={f.conjugation}
                        onChange={(e) => updateConjugation(tenseIdx, i, e.target.value)}
                        className="font-medium text-right bg-transparent border-b border-border focus:border-primary outline-none px-1 w-full"
                      />
                    ) : (
                      <span className="font-medium">{f.conjugation}</span>
                    )}
                    {language && (
                      <SpeakButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSpeak(f.conjugation, key);
                        }}
                        isSpeaking={isSpeaking && speakingKey === key}
                        isSupported={isSupported}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {(t.exampleSentence || editable) && (
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-1 text-sm">
              {editable ? (
                <input
                  type="text"
                  value={t.exampleSentence ?? ""}
                  onChange={(e) => updateExampleSentence(tenseIdx, e.target.value)}
                  placeholder="Example sentence..."
                  className="italic text-text-muted bg-transparent border-b border-border focus:border-primary outline-none px-1 flex-1"
                />
              ) : (
                <span className="italic text-text-muted">{t.exampleSentence}</span>
              )}
              {language && t.exampleSentence && (
                <SpeakButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak(t.exampleSentence!, `${t.tense}-example`);
                  }}
                  isSpeaking={isSpeaking && speakingKey === `${t.tense}-example`}
                  isSupported={isSupported}
                />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
