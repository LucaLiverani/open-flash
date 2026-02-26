-- Stores per-language tense preferences
CREATE TABLE IF NOT EXISTS language_tense_prefs (
  language TEXT PRIMARY KEY,
  all_tenses TEXT NOT NULL,       -- JSON array: ["Presente", "Passato Prossimo", ...]
  selected_tenses TEXT NOT NULL,  -- JSON array: subset of all_tenses
  created_at TEXT DEFAULT (datetime('now'))
);

-- Stores saved verb conjugations
CREATE TABLE IF NOT EXISTS saved_verbs (
  id TEXT PRIMARY KEY,
  language TEXT NOT NULL,
  infinitive TEXT NOT NULL,
  meaning TEXT NOT NULL,
  conjugations TEXT NOT NULL,     -- JSON blob: full ConjugationResult
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(language, infinitive)
);

CREATE INDEX IF NOT EXISTS idx_saved_verbs_language ON saved_verbs(language);
