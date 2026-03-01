import { getBookList } from "@/lib/books";
import BookCard from "@/components/BookCard";
import { getDB } from "@/lib/db";

interface ProgressRow {
  book_slug: string;
  chapter_number: number;
  completed: number;
  sentence_index: number;
}

export default async function ShadowingPage() {
  const books = getBookList();

  // Fetch progress for all books
  let progressMap: Record<
    string,
    { completedChapters: number; totalSentencesRead: number }
  > = {};

  try {
    const db = await getDB();
    const rows = await db
      .prepare("SELECT book_slug, chapter_number, completed, sentence_index FROM reading_progress")
      .all<ProgressRow>();

    const byBook: Record<string, ProgressRow[]> = {};
    for (const row of rows.results) {
      if (!byBook[row.book_slug]) byBook[row.book_slug] = [];
      byBook[row.book_slug].push(row);
    }

    for (const [slug, chapters] of Object.entries(byBook)) {
      progressMap[slug] = {
        completedChapters: chapters.filter((c) => c.completed).length,
        totalSentencesRead: chapters.reduce(
          (sum, c) => sum + c.sentence_index + 1,
          0
        ),
      };
    }
  } catch {
    // DB may not have the table yet
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text mb-6">Shadowing</h1>
      <p className="text-text-muted mb-6">
        Read along with a narrator. Tap any word for its translation.
      </p>

      <div className="grid gap-4">
        {books.map((book) => (
          <BookCard
            key={book.slug}
            book={book}
            progress={progressMap[book.slug]}
          />
        ))}
      </div>
    </main>
  );
}
