import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export async function GET() {
  const db = await getDB();

  const totalDecks = await db
    .prepare("SELECT COUNT(*) as count FROM decks")
    .first<{ count: number }>();

  const totalCards = await db
    .prepare("SELECT COUNT(*) as count FROM cards")
    .first<{ count: number }>();

  const dueToday = await db
    .prepare(
      "SELECT COUNT(*) as count FROM cards WHERE next_review <= date('now')"
    )
    .first<{ count: number }>();

  const studied = await db
    .prepare("SELECT COUNT(*) as count FROM cards WHERE repetitions > 0")
    .first<{ count: number }>();

  return NextResponse.json({
    totalDecks: totalDecks?.count ?? 0,
    totalCards: totalCards?.count ?? 0,
    dueToday: dueToday?.count ?? 0,
    studied: studied?.count ?? 0,
  });
}
