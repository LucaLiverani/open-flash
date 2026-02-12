import { notFound } from "next/navigation";
import { getDB, type Deck, type Card } from "@/lib/db";
import DeckDetailClient from "@/components/DeckDetailClient";

export const dynamic = "force-dynamic";

export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDB();

  const deck = await db
    .prepare("SELECT * FROM decks WHERE id = ?")
    .bind(id)
    .first<Deck>();

  if (!deck) notFound();

  const { results: cards } = await db
    .prepare("SELECT * FROM cards WHERE deck_id = ? ORDER BY created_at DESC")
    .bind(id)
    .all<Card>();

  const dueResult = await db
    .prepare(
      "SELECT COUNT(*) as count FROM cards WHERE deck_id = ? AND next_review <= date('now')"
    )
    .bind(id)
    .first<{ count: number }>();

  return (
    <DeckDetailClient
      deck={deck}
      initialCards={cards}
      dueCount={dueResult?.count ?? 0}
    />
  );
}
