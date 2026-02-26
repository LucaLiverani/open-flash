"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import VerbExercise, { type ExerciseData } from "@/components/VerbExercise";
import VerbStudySummary, { type MissedVerb } from "@/components/VerbStudySummary";

interface DueVerb {
  id: string;
  infinitive: string;
  meaning: string;
  conjugations: string;
}

type SessionState = "loading" | "exercising" | "complete";

export default function VerbDeckStudySession() {
  const searchParams = useSearchParams();
  const params = useParams();
  const deckId = params.id as string;
  const tense = searchParams.get("tense") ?? "";
  const mode = searchParams.get("mode") as "due" | "practice";
  const translationLang = searchParams.get("tlang") ?? "";

  const [state, setState] = useState<SessionState>("loading");
  const [queue, setQueue] = useState<DueVerb[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exercise, setExercise] = useState<ExerciseData | null>(null);
  const [prefetchedExercise, setPrefetchedExercise] = useState<ExerciseData | null>(null);
  const [totalExercises, setTotalExercises] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [missed, setMissed] = useState<MissedVerb[]>([]);
  const [error, setError] = useState<string | null>(null);

  const queueRef = useRef<DueVerb[]>([]);
  const currentIndexRef = useRef(0);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  const fetchExercise = useCallback(async (verb: DueVerb): Promise<ExerciseData | null> => {
    try {
      const res = await fetch("/api/verbs/study/exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saved_verb_id: verb.id,
          tense,
          ...(translationLang ? { translation_lang: translationLang } : {}),
        }),
      });
      if (!res.ok) throw new Error("Failed to generate exercise");
      return await res.json() as ExerciseData;
    } catch {
      return null;
    }
  }, [tense, translationLang]);

  const prefetchNext = useCallback((q: DueVerb[], idx: number) => {
    const nextIdx = idx + 1;
    if (nextIdx < q.length) {
      fetchExercise(q[nextIdx]).then((ex) => {
        setPrefetchedExercise(ex);
      });
    }
  }, [fetchExercise]);

  // Load initial queue
  useEffect(() => {
    if (!tense) return;

    (async () => {
      try {
        let verbs: DueVerb[];
        if (mode === "due") {
          const res = await fetch(
            `/api/verbs/study/due?verb_deck_id=${deckId}&tense=${encodeURIComponent(tense)}`
          );
          if (!res.ok) throw new Error("Failed to load due verbs");
          verbs = await res.json() as DueVerb[];
        } else {
          const res = await fetch(`/api/verbs?verb_deck_id=${deckId}`);
          if (!res.ok) throw new Error("Failed to load verbs");
          verbs = await res.json() as DueVerb[];
        }

        if (verbs.length === 0) {
          setError("No verbs available for study.");
          return;
        }

        setQueue(verbs);
        setTotalExercises(verbs.length);

        const first = await fetchExercise(verbs[0]);
        if (!first) {
          setError("Failed to generate exercise. Please try again.");
          return;
        }
        setExercise(first);
        setState("exercising");

        if (verbs.length > 1) {
          fetchExercise(verbs[1]).then(setPrefetchedExercise);
        }
      } catch {
        setError("Failed to start study session.");
      }
    })();
  }, [deckId, tense, mode, fetchExercise]);

  // Called when user presses "Check" — start prefetching the next exercise immediately
  const handleChecked = useCallback((correct: boolean) => {
    const q = queueRef.current;
    const idx = currentIndexRef.current;

    if (!correct) {
      // Build the reshuffled queue and prefetch based on it
      const reshuffled = [...q];
      const verb = reshuffled[idx];
      const remaining = reshuffled.length - idx - 1;
      const insertPos = idx + 1 + Math.max(1, Math.floor(remaining * 0.66));
      reshuffled.splice(Math.min(insertPos, reshuffled.length), 0, verb);
      // Invalidate stale prefetch and prefetch from reshuffled queue
      setPrefetchedExercise(null);
      const nextIdx = idx + 1;
      if (nextIdx < reshuffled.length) {
        fetchExercise(reshuffled[nextIdx]).then(setPrefetchedExercise);
      }
    }
    // If correct, the existing prefetch is still valid — nothing to do
  }, [fetchExercise]);

  // Called when user presses "Continue" — advance to the next exercise
  const handleResult = useCallback(async (correct: boolean, userAnswer: string) => {
    if (!exercise) return;

    if (correct) {
      setCorrectCount((c) => c + 1);
    } else {
      setIncorrectCount((c) => c + 1);
      setMissed((prev) => [
        ...prev,
        {
          infinitive: exercise.infinitive,
          tense: exercise.tense,
          person: exercise.person,
          userAnswer,
          correctAnswer: exercise.answer,
        },
      ]);
    }

    if (mode === "due") {
      fetch("/api/verbs/study/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saved_verb_id: exercise.saved_verb_id,
          tense,
          quality: correct ? 3 : 0,
        }),
      }).catch(() => {});
    }

    let effectiveQueue = [...queueRef.current];
    const idx = currentIndexRef.current;

    if (!correct) {
      const verb = effectiveQueue[idx];
      const remaining = effectiveQueue.length - idx - 1;
      const insertPos = idx + 1 + Math.max(1, Math.floor(remaining * 0.66));
      effectiveQueue.splice(Math.min(insertPos, effectiveQueue.length), 0, verb);
      setQueue(effectiveQueue);
      queueRef.current = effectiveQueue;
      setTotalExercises((t) => t + 1);
    }

    const nextIdx = idx + 1;

    if (nextIdx >= effectiveQueue.length) {
      setState("complete");
      return;
    }

    setCurrentIndex(nextIdx);

    if (prefetchedExercise) {
      setExercise(prefetchedExercise);
      setPrefetchedExercise(null);
      prefetchNext(effectiveQueue, nextIdx);
    } else {
      const next = await fetchExercise(effectiveQueue[nextIdx]);
      if (next) {
        setExercise(next);
        prefetchNext(effectiveQueue, nextIdx);
      } else {
        setError("Failed to generate exercise.");
      }
    }
  }, [exercise, mode, tense, prefetchedExercise, fetchExercise, prefetchNext]);

  const handleStudyAgain = () => {
    window.location.href = `/verbs/${deckId}/study`;
  };

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <span className="text-5xl mb-4 block">😔</span>
        <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
        <p className="text-text-muted mb-6">{error}</p>
        <Link href={`/verbs/${deckId}/study`} className="btn btn-primary">
          Back to Study
        </Link>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-muted">Generating exercise...</p>
      </div>
    );
  }

  if (state === "complete") {
    return (
      <VerbStudySummary
        total={correctCount + incorrectCount}
        correctCount={correctCount}
        incorrectCount={incorrectCount}
        missed={missed}
        onStudyAgain={handleStudyAgain}
        deckId={deckId}
      />
    );
  }

  if (!exercise) return null;

  return (
    <div className="max-w-md mx-auto">
      <p className="text-center text-sm text-text-muted mb-4">
        {mode === "due" ? "Review" : "Practice"} — {tense}
      </p>
      <VerbExercise
        exercise={exercise}
        current={currentIndex}
        total={totalExercises}
        onResult={handleResult}
        onChecked={handleChecked}
      />
    </div>
  );
}
