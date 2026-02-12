import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDB();

  const deck = await db
    .prepare("SELECT id FROM decks WHERE id = ?")
    .bind(id)
    .first();

  if (!deck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  await db
    .prepare(
      `UPDATE cards SET
        interval = 0,
        repetitions = 0,
        ease_factor = 2.5,
        next_review = date('now')
      WHERE deck_id = ?`
    )
    .bind(id)
    .run();

  return NextResponse.json({ success: true });
}
