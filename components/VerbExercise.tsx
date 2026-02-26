"use client";

import { useState, useRef, useEffect } from "react";
import { isAnswerCorrect } from "@/lib/accent";

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
}

export default function VerbExercise({ exercise, current, total, onResult, onChecked }: VerbExerciseProps) {
  const [userAnswer, setUserAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUserAnswer("");
    setSubmitted(false);
    setCorrect(false);
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
          {parts[0]}
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
          {parts[1]}
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
            <p className="text-sm text-text-muted">{exercise.sentence}</p>
            <p className="text-sm text-text-muted italic mt-1">{exercise.translation}</p>
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
