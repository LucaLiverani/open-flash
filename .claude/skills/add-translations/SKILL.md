---
name: add-translations
description: Add pre-computed translations to a shadowing book JSON file
argument-hint: [book-json-path] [langs]
allowed-tools: Read, Write, Edit, Glob
---

# Add Translations to Book JSON

Add pre-computed translations to a book JSON file so translations appear instantly in the reading UI (no API call needed).

## Arguments

Both arguments are optional — Claude infers sensible defaults.

1. `book-json-path` (optional) — path to a specific book JSON file. If omitted, find ALL book JSON files in `data/books/*.json` and process each one.
2. `langs` (optional) — comma-separated target language codes. Default: `it,en`

## Steps

### 1. Find the book(s) to translate

- If a path is provided, use that file
- If no path is provided, glob `data/books/*.json` to find all book files and process each one

### 2. Read the book JSON

Read the book JSON file and parse its structure. Note which sentences already have translations for the requested languages (the `translations` field on each sentence object).

### 3. Translate chapter by chapter using parallel agents

Launch one agent per chapter in parallel (using `run_in_background: true`). Each agent writes a temporary JSON file with translations for its chapter.

**Agent instructions** — each agent must:

1. Read the book JSON and extract its assigned chapter
2. Translate every sentence that doesn't already have translations for the target languages
3. Write the results to a temp file: `data/books/<slug>-ch<N>-translations.json`

**Translation output format** — each entry MUST include `id` (the sentence's hash ID), `idx` (0-based sentence index), and `ref` (first 50 characters of the original Spanish text) for alignment verification:

```json
[
  {
    "id": "a1b2c3d4",
    "idx": 0,
    "ref": "En un lugar de la Mancha, de cuyo nombre no",
    "it": "In un luogo della Mancia, di cui non voglio...",
    "en": "In a place in La Mancha, whose name I do not..."
  },
  {
    "id": "e5f6a7b8",
    "idx": 1,
    "ref": "...",
    "it": "...",
    "en": "..."
  }
]
```

The `id`, `idx`, and `ref` fields are CRITICAL for the merge step to verify that every translation is aligned to the correct source sentence. The agent must include them for every entry.

The source language is Spanish (`es`). For each sentence:

- If `sentence.translations` already contains the target language key, still include the entry with the existing translation (so idx/ref stay contiguous)
- Translate naturally and accurately
- Preserve the tone and register of the original text
- For literary/narrative text, maintain the literary quality in translation

### 4. Merge translations with alignment verification

After all agents complete, merge translations back into the book JSON. The merge step MUST verify alignment:

```
For each chapter temp file:
  1. Parse the translations array
  2. Check array length matches the chapter's sentence count — abort on mismatch
  3. For EVERY entry, verify:
     - entry.id === chapter.sentences[entry.idx].id (primary key match)
     - entry.idx matches the array position
     - The chapter sentence at that index starts with entry.ref
  4. If any check fails, report the misaligned entry and ABORT (do not write partial results)
  5. If all checks pass, copy translations onto the sentence objects
```

Only after all chapters pass verification, write the updated book JSON.

### 5. Clean up

Remove the temporary `<slug>-ch<N>-translations.json` files after a successful merge.

## Translation Quality Guidelines

- Translate naturally -- these translations are shown alongside the original text for language learners
- Maintain the literary style and tone of the original
- For Italian (it): use standard Italian, not regional dialects
- For English (en): use standard American English
- Keep proper nouns unchanged (character names, place names)
- Preserve sentence structure where possible so learners can see parallels between source and translation
- For idiomatic expressions, provide a natural translation rather than a word-for-word one, but keep it close enough that learners can follow along
