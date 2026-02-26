import { NextResponse } from "next/server";
import { getDB, type SavedVerb, type VerbStudyProgress } from "@/lib/db";
import type { ConjugationResult } from "@/lib/gemini";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language");
  const verbDeckId = searchParams.get("verb_deck_id");
  const tense = searchParams.get("tense");

  if ((!language && !verbDeckId) || !tense) {
    return NextResponse.json(
      { error: "tense and either language or verb_deck_id query parameters are required" },
      { status: 400 }
    );
  }

  const db = await getDB();
  const today = new Date().toISOString().split("T")[0];

  // Build WHERE clause based on whether we're filtering by deck or language
  const filterClause = verbDeckId ? "sv.verb_deck_id = ?" : "sv.language = ?";
  const filterValue = verbDeckId || language;

  const { results } = await db
    .prepare(
      `SELECT sv.*, vsp.id as progress_id, vsp.tense as progress_tense,
              vsp.interval as progress_interval, vsp.repetitions as progress_repetitions,
              vsp.ease_factor as progress_ease_factor, vsp.next_review as progress_next_review
       FROM saved_verbs sv
       LEFT JOIN verb_study_progress vsp ON vsp.saved_verb_id = sv.id AND vsp.tense = ?
       WHERE ${filterClause}
         AND (vsp.id IS NULL OR vsp.next_review <= ?)
       ORDER BY
         CASE WHEN vsp.repetitions = 0 AND vsp.id IS NOT NULL THEN 0 ELSE 1 END,
         COALESCE(vsp.ease_factor, 2.5) ASC`
    )
    .bind(tense, filterValue, today)
    .all<SavedVerb & {
      progress_id: string | null;
      progress_tense: string | null;
      progress_interval: number | null;
      progress_repetitions: number | null;
      progress_ease_factor: number | null;
      progress_next_review: string | null;
    }>();

  // Filter to verbs that actually have the requested tense in their conjugations
  const filtered = results.filter((row) => {
    try {
      const conj = JSON.parse(row.conjugations) as ConjugationResult;
      return conj.tenses.some((t) => t.tense === tense && t.forms.length > 0);
    } catch {
      return false;
    }
  });

  const dueVerbs = filtered.map((row) => ({
    id: row.id,
    language: row.language,
    infinitive: row.infinitive,
    meaning: row.meaning,
    conjugations: row.conjugations,
    created_at: row.created_at,
    progress: row.progress_id
      ? {
          id: row.progress_id,
          tense: row.progress_tense!,
          interval: row.progress_interval!,
          repetitions: row.progress_repetitions!,
          ease_factor: row.progress_ease_factor!,
          next_review: row.progress_next_review!,
        }
      : null,
  }));

  return NextResponse.json(dueVerbs);
}
