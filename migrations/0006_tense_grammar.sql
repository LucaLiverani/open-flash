CREATE TABLE IF NOT EXISTS tense_grammar (
  id TEXT PRIMARY KEY,
  language TEXT NOT NULL,
  tense TEXT NOT NULL,
  explanation TEXT NOT NULL,
  when_to_use TEXT NOT NULL,
  examples TEXT NOT NULL,
  common_mistakes TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(language, tense)
);

CREATE INDEX IF NOT EXISTS idx_tense_grammar_language ON tense_grammar(language);
