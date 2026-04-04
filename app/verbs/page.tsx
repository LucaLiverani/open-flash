import Link from "next/link";
import { getDB, type VerbDeckWithCounts, LANGUAGES, type LanguageCode } from "@/lib/db";
import VerbDeckCard from "@/components/VerbDeckCard";
import EmptyState from "@/components/EmptyState";
import GrammarReference from "@/components/GrammarReference";

export const dynamic = "force-dynamic";

export default async function VerbDecksPage() {
  const db = await getDB();
  const { results: decks } = await db
    .prepare(
      `SELECT vd.*,
        COUNT(sv.id) as verb_count,
        COUNT(DISTINCT CASE
          WHEN vsp.id IS NULL OR vsp.next_review <= date('now') THEN sv.id
        END) as due_count
      FROM verb_decks vd
      LEFT JOIN saved_verbs sv ON sv.verb_deck_id = vd.id
      LEFT JOIN verb_study_progress vsp ON vsp.saved_verb_id = sv.id
      GROUP BY vd.id
      ORDER BY vd.created_at DESC`
    )
    .all<VerbDeckWithCounts>();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Verb Decks</h1>
        <Link
          href="/verbs/new"
          className="btn btn-primary"
        >
          New Verb Deck
        </Link>
      </div>

      {decks.length === 0 ? (
        <EmptyState
          emoji="📖"
          title="No verb decks yet"
          description="Create your first verb deck to start conjugating and studying verbs."
          ctaText="Create Verb Deck"
          ctaHref="/verbs/new"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map((deck) => (
              <VerbDeckCard key={deck.id} deck={deck} />
            ))}
          </div>

          <div className="mt-8">
            <GrammarReference
              languages={Array.from(
                new Map(
                  decks.map((d) => [
                    d.language,
                    {
                      code: d.language,
                      name: LANGUAGES[d.language as LanguageCode] ?? d.language,
                      translationLang: d.translation_lang,
                    },
                  ])
                ).values()
              )}
            />
          </div>
        </>
      )}
    </div>
  );
}
