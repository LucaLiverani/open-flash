"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { isAnswerCorrect } from "@/lib/accent";
import { useSpeech } from "@/lib/useSpeech";
import SpeakButton from "./SpeakButton";
import WordSpans from "./WordSpans";
import WordTooltip from "./WordTooltip";
import AddToVocabDeckModal from "./AddToVocabDeckModal";
import AddToVerbDeckModal from "./AddToVerbDeckModal";

export interface ExerciseData {
  sentence: string;
  blankedSentence: string;
  answer: string;
  person: string;
  hint: string;
  translation: string;
  saved_verb_id: string;
  infinitive: string;
  meaning: string;
  tense: string;
}

interface VerbExerciseProps {
  exercise: ExerciseData;
  current: number;
  total: number;
  onResult: (correct: boolean, userAnswer: string) => void;
  onChecked?: (correct: boolean) => void;
  language?: string;
  translationLang?: string;
}

export default function VerbExercise({ exercise, current, total, onResult, onChecked, language, translationLang }: VerbExerciseProps) {
  const { speak, isSpeaking, isSupported } = useSpeech();
  const [userAnswer, setUserAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Word tooltip state
  const [tooltip, setTooltip] = useState<{ word: string; rect: DOMRect } | null>(null);
  const [addWordModal, setAddWordModal] = useState<{ word: string; translation: string; sentence: string } | null>(null);
  const [addVerbModal, setAddVerbModal] = useState<{ word: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleWordClick = useCallback((e: React.MouseEvent<HTMLSpanElement>, word: string) => {
    e.stopPropagation();
    const cleaned = word.replace(/[.,;:!?"""''()[\]{}¡¿«»]/g, "").trim();
    if (!cleaned) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({ word: cleaned, rect });
  }, []);

  function openWordModal(word: string, trans: string) {
    setTooltip(null);
    setAddWordModal({ word, translation: trans, sentence: exercise.sentence });
  }

  function openVerbModal(word: string) {
    setTooltip(null);
    setAddVerbModal({ word });
  }

  function handleModalClose(successMessage?: string) {
    setAddWordModal(null);
    setAddVerbModal(null);
    if (successMessage) {
      setToast(successMessage);
      setTimeout(() => setToast(null), 2500);
    }
  }

  useEffect(() => {
    setUserAnswer("");
    setSubmitted(false);
    setCorrect(false);
    setTooltip(null);
    inputRef.current?.focus();
  }, [exercise]);

  const handleSubmit = () => {
    if (submitted) {
      onResult(correct, userAnswer);
      return;
    }
    if (!userAnswer.trim()) return;
    const isCorrect = isAnswerCorrect(userAnswer, exercise.answer);
    setCorrect(isCorrect);
    setSubmitted(true);
    onChecked?.(isCorrect);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const progress = ((current) / total) * 100;

  // Split blanked sentence around "___" for rendering
  const parts = exercise.blankedSentence.split("___");

  return (
    <div>
      {/* Progress bar */}
      <div className="w-full bg-border rounded-full h-2 mb-6">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-text-muted text-right mb-4">
        {current + 1} / {total}
      </p>

      {/* Hint */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-6">
        <p className="text-sm text-text-muted">{exercise.hint}</p>
      </div>

      {/* Blanked sentence */}
      <div className="text-center mb-6">
        <p className="text-xl sm:text-2xl leading-relaxed">
          <WordSpans sentence={parts[0]} onWordClick={handleWordClick} />
          {submitted ? (
            <span
              className={`font-bold px-1 rounded ${
                correct
                  ? "text-secondary-dark bg-secondary/10"
                  : "text-danger bg-danger/10"
              }`}
            >
              {correct ? exercise.answer : userAnswer}
            </span>
          ) : (
            <span className="inline-block border-b-2 border-primary min-w-[80px] mx-1">
              &nbsp;
            </span>
          )}
          <WordSpans sentence={parts[1]} onWordClick={handleWordClick} />
        </p>
      </div>

      {/* Input */}
      {!submitted && (
        <div className="flex gap-3 mb-6">
          <input
            ref={inputRef}
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type the conjugated form..."
            className="input flex-1 text-center text-lg"
            autoComplete="off"
            autoCapitalize="off"
          />
          <button
            onClick={handleSubmit}
            disabled={!userAnswer.trim()}
            className="btn btn-primary"
          >
            Check
          </button>
        </div>
      )}

      {/* Word tooltip */}
      {tooltip && language && translationLang && (
        <WordTooltip
          word={tooltip.word}
          rect={tooltip.rect}
          sourceLang={language}
          targetLang={translationLang}
          onDismiss={() => setTooltip(null)}
          onAddAsWord={openWordModal}
          onAddAsVerb={openVerbModal}
        />
      )}

      {/* Add word modal */}
      {addWordModal && language && translationLang && (
        <AddToVocabDeckModal
          word={addWordModal.word}
          translation={addWordModal.translation}
          exampleSentence={addWordModal.sentence}
          sourceLang={language}
          targetLang={translationLang}
          onClose={handleModalClose}
        />
      )}

      {/* Add verb modal */}
      {addVerbModal && language && (
        <AddToVerbDeckModal
          word={addVerbModal.word}
          language={language}
          onClose={handleModalClose}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-lg px-4 py-2 text-sm text-text shadow-lg z-50 pointer-events-none">
          {toast}
        </div>
      )}

      {/* Result feedback */}
      {submitted && (
        <div className="space-y-3 mb-6">
          {correct ? (
            <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4 text-center">
              <p className="font-semibold text-secondary-dark">Correct!</p>
            </div>
          ) : (
            <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 text-center">
              <p className="font-semibold text-danger mb-1">
                Incorrect — the answer is: <span className="underline">{exercise.answer}</span>
              </p>
              <p className="text-sm text-text-muted">
                You wrote: {userAnswer}
              </p>
            </div>
          )}
          <div className="bg-surface rounded-lg border border-border p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <p className="text-sm text-text-muted">
                <WordSpans sentence={exercise.sentence} onWordClick={handleWordClick} />
              </p>
              {language && (
                <SpeakButton
                  onClick={() => speak(exercise.sentence, language)}
                  isSpeaking={isSpeaking}
                  isSupported={isSupported}
                />
              )}
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <p className="text-sm text-text-muted italic">{exercise.translation}</p>
              {translationLang && (
                <SpeakButton
                  onClick={() => speak(exercise.translation, translationLang)}
                  isSpeaking={isSpeaking}
                  isSupported={isSupported}
                />
              )}
            </div>
          </div>
          <button
            onClick={handleSubmit}
            className="btn btn-primary w-full"
            autoFocus
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
