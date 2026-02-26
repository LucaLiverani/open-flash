CREATE TABLE verb_study_progress (
  id TEXT PRIMARY KEY,
  saved_verb_id TEXT NOT NULL REFERENCES saved_verbs(id) ON DELETE CASCADE,
  tense TEXT NOT NULL,
  interval INTEGER DEFAULT 0,
  repetitions INTEGER DEFAULT 0,
  ease_factor REAL DEFAULT 2.5,
  next_review TEXT DEFAULT (date('now')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(saved_verb_id, tense)
);
CREATE INDEX idx_verb_study_progress_next_review ON verb_study_progress(next_review);
