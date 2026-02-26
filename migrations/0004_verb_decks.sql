CREATE TABLE IF NOT EXISTS verb_decks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '📖',
  language TEXT NOT NULL,
  translation_lang TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

ALTER TABLE saved_verbs ADD COLUMN verb_deck_id TEXT REFERENCES verb_decks(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_saved_verbs_verb_deck_id ON saved_verbs(verb_deck_id);
