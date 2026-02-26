"use client";

import Link from "next/link";

export interface MissedVerb {
  infinitive: string;
  tense: string;
  person: string;
  userAnswer: string;
  correctAnswer: string;
}

interface VerbStudySummaryProps {
  total: number;
  correctCount: number;
  incorrectCount: number;
  missed: MissedVerb[];
  onStudyAgain: () => void;
  deckId?: string;
}

export default function VerbStudySummary({
  total,
  correctCount,
  incorrectCount,
  missed,
  onStudyAgain,
  deckId,
}: VerbStudySummaryProps) {
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const backHref = deckId ? `/verbs/${deckId}` : "/verbs";

  return (
    <div className="max-w-md mx-auto text-center py-10">
      <span className="text-5xl mb-4 block">
        {accuracy >= 80 ? "🎊" : accuracy >= 50 ? "📝" : "💪"}
      </span>
      <h1 className="text-2xl font-bold mb-2">Session Complete!</h1>
      <p className="text-text-muted mb-6">
        You completed {total} exercise{total !== 1 ? "s" : ""}.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-secondary/10 rounded-lg p-3">
          <p className="text-2xl font-bold text-secondary-dark">{correctCount}</p>
          <p className="text-xs text-text-muted">Correct</p>
        </div>
        <div className="bg-danger/10 rounded-lg p-3">
          <p className="text-2xl font-bold text-danger">{incorrectCount}</p>
          <p className="text-xs text-text-muted">Incorrect</p>
        </div>
        <div className="bg-primary/10 rounded-lg p-3">
          <p className="text-2xl font-bold text-primary">{accuracy}%</p>
          <p className="text-xs text-text-muted">Accuracy</p>
        </div>
      </div>

      {/* Missed verbs */}
      {missed.length > 0 && (
        <div className="mb-6 text-left">
          <h3 className="font-semibold mb-3 text-center">Missed</h3>
          <div className="space-y-2">
            {missed.map((m, i) => (
              <div
                key={i}
                className="bg-surface rounded-lg border border-border p-3 text-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{m.infinitive} — {m.person}</p>
                    <p className="text-text-muted text-xs">{m.tense}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-danger line-through">{m.userAnswer}</p>
                    <p className="text-secondary-dark font-medium">{m.correctAnswer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <Link href={backHref} className="btn btn-ghost">
          Back to Deck
        </Link>
        <button onClick={onStudyAgain} className="btn btn-primary">
          Study Again
        </button>
      </div>
    </div>
  );
}
