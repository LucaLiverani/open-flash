import { NextResponse } from "next/server";
import { getDB, type VerbStudyProgress } from "@/lib/db";
import { sm2, type SM2Input } from "@/lib/sm2";

export async function POST(request: Request) {
  const body = await request.json() as { saved_verb_id: string; tense: string; quality: number };
  const { saved_verb_id, tense, quality } = body;

  if (!saved_verb_id || !tense || quality === undefined) {
    return NextResponse.json(
      { error: "saved_verb_id, tense, and quality are required" },
      { status: 400 }
    );
  }

  if (![0, 3].includes(quality)) {
    return NextResponse.json(
      { error: "quality must be 0 or 3" },
      { status: 400 }
    );
  }

  const db = await getDB();

  // Get existing progress or use defaults
  let progress = await db
    .prepare(
      "SELECT * FROM verb_study_progress WHERE saved_verb_id = ? AND tense = ?"
    )
    .bind(saved_verb_id, tense)
    .first<VerbStudyProgress>();

  const result = sm2({
    quality: quality as SM2Input["quality"],
    repetitions: progress?.repetitions ?? 0,
    easeFactor: progress?.ease_factor ?? 2.5,
    interval: progress?.interval ?? 0,
  });

  if (progress) {
    await db
      .prepare(
        `UPDATE verb_study_progress SET
          interval = ?,
          repetitions = ?,
          ease_factor = ?,
          next_review = ?
        WHERE id = ?`
      )
      .bind(
        result.interval,
        result.repetitions,
        result.easeFactor,
        result.nextReview,
        progress.id
      )
      .run();
  } else {
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO verb_study_progress (id, saved_verb_id, tense, interval, repetitions, ease_factor, next_review)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        saved_verb_id,
        tense,
        result.interval,
        result.repetitions,
        result.easeFactor,
        result.nextReview
      )
      .run();
  }

  progress = await db
    .prepare(
      "SELECT * FROM verb_study_progress WHERE saved_verb_id = ? AND tense = ?"
    )
    .bind(saved_verb_id, tense)
    .first<VerbStudyProgress>();

  return NextResponse.json(progress);
}
