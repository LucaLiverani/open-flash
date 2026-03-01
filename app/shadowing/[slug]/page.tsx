import Link from "next/link";
import { getBook } from "@/lib/books";
import { getDB } from "@/lib/db";
import { notFound } from "next/navigation";

interface ProgressRow {
  chapter_number: number;
  sentence_index: number;
  completed: number;
}

export default async function BookChaptersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = await getBook(slug);
  if (!book) notFound();

  // Fetch progress
  let progressMap: Record<number, ProgressRow> = {};
  try {
    const db = await getDB();
    const rows = await db
      .prepare(
        "SELECT chapter_number, sentence_index, completed FROM reading_progress WHERE book_slug = ?"
      )
      .bind(slug)
      .all<ProgressRow>();
    for (const row of rows.results) {
      progressMap[row.chapter_number] = row;
    }
  } catch {
    // DB may not have the table yet
  }

  // Find the chapter to continue from
  let continueChapter = 1;
  for (const ch of book.chapters) {
    const p = progressMap[ch.number];
    if (p && !p.completed) {
      continueChapter = ch.number;
      break;
    }
    if (!p) {
      continueChapter = ch.number;
      break;
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href="/shadowing"
        className="text-sm text-text-muted hover:text-text transition-colors"
      >
        ← Back to Library
      </Link>

      <div className="flex items-start gap-4 mt-4 mb-6">
        <span className="text-5xl">{book.emoji}</span>
        <div>
          <h1 className="text-2xl font-bold text-text">{book.title}</h1>
          <p className="text-text-muted">{book.author}</p>
        </div>
      </div>

      {/* Continue reading button */}
      <Link
        href={`/shadowing/${slug}/${continueChapter}`}
        className="btn btn-primary w-full text-center mb-6 block"
      >
        Continue Reading — Chapter {continueChapter}
      </Link>

      {/* Chapter list */}
      <div className="space-y-2">
        {book.chapters.map((ch) => {
          const progress = progressMap[ch.number];
          const isCompleted = progress?.completed === 1;
          const sentencesRead = progress ? progress.sentence_index + 1 : 0;
          const totalSentences = ch.sentences.length;

          return (
            <Link
              key={ch.number}
              href={`/shadowing/${slug}/${ch.number}`}
              className="flex items-center gap-3 bg-surface rounded-lg border border-border p-4 hover:border-primary/40 hover:bg-surface-hover transition-colors"
            >
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  isCompleted
                    ? "bg-primary/20 text-primary"
                    : "bg-border text-text-muted"
                }`}
              >
                {isCompleted ? "✓" : ch.number}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">
                  {ch.title}
                </p>
                <p className="text-xs text-text-muted">
                  {totalSentences} sentences
                  {sentencesRead > 0 && !isCompleted && (
                    <span className="ml-2">
                      · {sentencesRead}/{totalSentences} read
                    </span>
                  )}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
