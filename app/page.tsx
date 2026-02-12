import Link from "next/link";
import { getDB, type DeckWithCounts } from "@/lib/db";
import DeckCard from "@/components/DeckCard";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
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

  const { results: recentDecks } = await db
    .prepare(
      `SELECT d.*,
        COUNT(c.id) as card_count,
        COUNT(CASE WHEN c.next_review <= date('now') THEN 1 END) as due_count
      FROM decks d
      LEFT JOIN cards c ON c.deck_id = d.id
      GROUP BY d.id
      ORDER BY d.created_at DESC
      LIMIT 6`
    )
    .all<DeckWithCounts>();

  const stats = [
    { label: "Decks", value: totalDecks?.count ?? 0, emoji: "📚" },
    { label: "Cards", value: totalCards?.count ?? 0, emoji: "📝" },
    { label: "Due Today", value: dueToday?.count ?? 0, emoji: "🔥" },
    { label: "Studied", value: studied?.count ?? 0, emoji: "✅" },
  ];

  const decksWithDue = recentDecks.filter((d) => d.due_count > 0);
  const decksWithCards = recentDecks.filter((d) => d.card_count > 0);

  return (
    <div>
      {/* Hero: Study now */}
      {decksWithDue.length > 0 ? (
        <div className="mb-10">
          <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-6 sm:p-8 text-black mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              Time to study!
            </h1>
            <p className="text-black/70 mb-6">
              You have {dueToday?.count ?? 0} cards waiting for review across{" "}
              {decksWithDue.length} deck{decksWithDue.length !== 1 ? "s" : ""}.
            </p>
            <div className="space-y-3">
              {decksWithDue.map((deck) => (
                <Link
                  key={deck.id}
                  href={`/decks/${deck.id}/study`}
                  className="flex items-center justify-between bg-black/10 hover:bg-black/20 rounded-xl p-4 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{deck.emoji}</span>
                    <div>
                      <p className="font-semibold">{deck.name}</p>
                      <p className="text-sm text-black/60">
                        {deck.due_count} card{deck.due_count !== 1 ? "s" : ""} due
                      </p>
                    </div>
                  </div>
                  <span className="btn btn-lg bg-black text-primary font-semibold">
                    Study now
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : decksWithCards.length > 0 ? (
        <div className="mb-10">
          <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8">
            <h1 className="text-2xl font-bold mb-2">All caught up!</h1>
            <p className="text-text-muted mb-6">
              No cards due right now. You can still practice your decks.
            </p>
            <div className="space-y-3">
              {decksWithCards.map((deck) => (
                <Link
                  key={deck.id}
                  href={`/decks/${deck.id}/study`}
                  className="flex items-center justify-between bg-surface-hover hover:bg-border rounded-xl p-4 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{deck.emoji}</span>
                    <div>
                      <p className="font-medium">{deck.name}</p>
                      <p className="text-sm text-text-muted">
                        {deck.card_count} card{deck.card_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <span className="btn btn-primary">
                    Practice
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-text-muted text-sm">
            Your language learning progress at a glance.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface rounded-xl border border-border p-4 text-center"
          >
            <span className="text-2xl">{stat.emoji}</span>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
            <p className="text-xs text-text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent decks */}
      {recentDecks.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Your Decks</h2>
            <Link
              href="/decks"
              className="text-sm text-primary hover:text-primary-dark transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {recentDecks.map((deck) => (
              <DeckCard key={deck.id} deck={deck} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <span className="text-5xl mb-4 block">📚</span>
          <h2 className="text-xl font-semibold mb-2">Get started</h2>
          <p className="text-text-muted mb-4">
            Create your first deck to begin learning.
          </p>
          <Link href="/decks/new" className="btn btn-primary btn-lg">
            Create Deck
          </Link>
        </div>
      )}
    </div>
  );
}
