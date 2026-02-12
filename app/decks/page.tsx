import Link from "next/link";
import { getDB, type DeckWithCounts } from "@/lib/db";
import DeckCard from "@/components/DeckCard";
import EmptyState from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const db = await getDB();
  const { results: decks } = await db
    .prepare(
      `SELECT d.*,
        COUNT(c.id) as card_count,
        COUNT(CASE WHEN c.next_review <= date('now') THEN 1 END) as due_count
      FROM decks d
      LEFT JOIN cards c ON c.deck_id = d.id
      GROUP BY d.id
      ORDER BY d.created_at DESC`
    )
    .all<DeckWithCounts>();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Decks</h1>
        <Link
          href="/decks/new"
          className="btn btn-primary"
        >
          New Deck
        </Link>
      </div>

      {decks.length === 0 ? (
        <EmptyState
          emoji="📚"
          title="No decks yet"
          description="Create your first deck to start learning vocabulary."
          ctaText="Create Deck"
          ctaHref="/decks/new"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </div>
      )}
    </div>
  );
}
