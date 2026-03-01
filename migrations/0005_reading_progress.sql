-- Reading progress for the shadowing feature
CREATE TABLE IF NOT EXISTS reading_progress (
  id TEXT PRIMARY KEY,
  book_slug TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  sentence_index INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(book_slug, chapter_number)
);

CREATE INDEX IF NOT EXISTS idx_reading_progress_book ON reading_progress(book_slug);
