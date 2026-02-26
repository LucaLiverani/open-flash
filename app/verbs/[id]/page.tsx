import { notFound } from "next/navigation";
import { getDB, type VerbDeck, type SavedVerb } from "@/lib/db";
import VerbDeckDetailClient from "@/components/VerbDeckDetailClient";

export const dynamic = "force-dynamic";

export default async function VerbDeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDB();

  const deck = await db
    .prepare("SELECT * FROM verb_decks WHERE id = ?")
    .bind(id)
    .first<VerbDeck>();

  if (!deck) notFound();

  const { results: verbs } = await db
    .prepare("SELECT * FROM saved_verbs WHERE verb_deck_id = ? ORDER BY created_at DESC")
    .bind(id)
    .all<SavedVerb>();

  // Count due verbs: those with no progress or with next_review <= today
  const dueResult = await db
    .prepare(
      `SELECT COUNT(DISTINCT sv.id) as count
       FROM saved_verbs sv
       LEFT JOIN verb_study_progress vsp ON vsp.saved_verb_id = sv.id
       WHERE sv.verb_deck_id = ?
         AND (vsp.id IS NULL OR vsp.next_review <= date('now'))`
    )
    .bind(id)
    .first<{ count: number }>();

  return (
    <VerbDeckDetailClient
      deck={deck}
      initialVerbs={verbs}
      dueCount={dueResult?.count ?? 0}
    />
  );
}
