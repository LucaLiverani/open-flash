import Link from "next/link";
import { getBook, getChapter } from "@/lib/books";
import { getDB } from "@/lib/db";
import { notFound } from "next/navigation";
import BookReader from "@/components/BookReader";

interface ProgressRow {
  sentence_index: number;
}

export default async function ChapterReaderPage({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}) {
  const { slug, chapter: chapterStr } = await params;
  const chapterNum = parseInt(chapterStr, 10);
  if (isNaN(chapterNum)) notFound();

  const book = await getBook(slug);
  if (!book) notFound();

  const chapter = book.chapters.find((c) => c.number === chapterNum);
  if (!chapter) notFound();

  // Fetch saved progress for this chapter
  let initialSentenceIndex = 0;
  try {
    const db = await getDB();
    const row = await db
      .prepare(
        "SELECT sentence_index FROM reading_progress WHERE book_slug = ? AND chapter_number = ?"
      )
      .bind(slug, chapterNum)
      .first<ProgressRow>();
    if (row) {
      initialSentenceIndex = row.sentence_index;
    }
  } catch {
    // DB may not have the table yet
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href={`/shadowing/${slug}`}
        className="text-sm text-text-muted hover:text-text transition-colors"
      >
        ← {book.title}
      </Link>

      <div className="mt-4">
        <BookReader
          bookSlug={slug}
          chapter={chapter}
          totalChapters={book.chapterCount}
          initialSentenceIndex={initialSentenceIndex}
          language={book.language}
          defaultTargetLang="it"
        />
      </div>
    </main>
  );
}
