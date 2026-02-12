import { NextResponse } from "next/server";
import { getDB, type Card } from "@/lib/db";
import { sm2, type SM2Input } from "@/lib/sm2";

export async function POST(request: Request) {
  const body = await request.json() as { card_id: string; quality: number };
  const { card_id, quality } = body;

  if (!card_id || quality === undefined) {
    return NextResponse.json(
      { error: "card_id and quality are required" },
      { status: 400 }
    );
  }

  if (![0, 2, 3, 5].includes(quality)) {
    return NextResponse.json(
      { error: "quality must be 0, 2, 3, or 5" },
      { status: 400 }
    );
  }

  const db = await getDB();
  const card = await db
    .prepare("SELECT * FROM cards WHERE id = ?")
    .bind(card_id)
    .first<Card>();

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const result = sm2({
    quality: quality as SM2Input["quality"],
    repetitions: card.repetitions,
    easeFactor: card.ease_factor,
    interval: card.interval,
  });

  await db
    .prepare(
      `UPDATE cards SET
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
      card_id
    )
    .run();

  const updated = await db
    .prepare("SELECT * FROM cards WHERE id = ?")
    .bind(card_id)
    .first<Card>();

  return NextResponse.json(updated);
}
