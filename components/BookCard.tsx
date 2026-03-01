import Link from "next/link";
import type { BookMeta } from "@/lib/books";

interface BookCardProps {
  book: BookMeta;
  progress?: {
    completedChapters: number;
    totalSentencesRead: number;
  };
}

const difficultyColors: Record<string, string> = {
  beginner: "bg-green-500/20 text-green-400",
  intermediate: "bg-yellow-500/20 text-yellow-400",
  advanced: "bg-red-500/20 text-red-400",
};

export default function BookCard({ book, progress }: BookCardProps) {
  const progressPercent = progress
    ? Math.round((progress.completedChapters / book.chapterCount) * 100)
    : 0;

  return (
    <Link
      href={`/shadowing/${book.slug}`}
      className="block bg-surface rounded-xl border border-border p-5 hover:border-primary/40 hover:bg-surface-hover transition-colors"
    >
      <div className="flex items-start gap-4">
        <span className="text-4xl">{book.emoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-text truncate">{book.title}</h3>
          <p className="text-sm text-text-muted">{book.author}</p>
          <p className="text-sm text-text-muted mt-1 line-clamp-2">
            {book.description}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                difficultyColors[book.difficulty] ?? ""
              }`}
            >
              {book.difficulty}
            </span>
            <span className="text-xs text-text-muted">
              {book.chapterCount} chapters
            </span>
            <span className="text-xs text-text-muted">
              {book.sentenceCount} sentences
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {progress && progress.completedChapters > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-text-muted mb-1">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}
