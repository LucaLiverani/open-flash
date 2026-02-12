import { NextResponse } from "next/server";
import { getDB, type Card } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDB();

  // Failed cards first (interval=1, repetitions=0), then by next_review ASC
  const { results } = await db
    .prepare(
      `SELECT * FROM cards
       WHERE deck_id = ? AND next_review <= date('now')
       ORDER BY
         CASE WHEN repetitions = 0 AND interval <= 1 THEN 0 ELSE 1 END,
         next_review ASC`
    )
    .bind(id)
    .all<Card>();

  return NextResponse.json(results);
}
