---
name: prepare-book
description: Convert a PDF into structured book JSON for the shadowing feature
argument-hint: [pdf-path]
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# Prepare Book from PDF

Convert a Spanish PDF into structured book JSON for the shadowing/reading feature.

## Arguments

All arguments are optional — Claude picks the right PDF automatically.

1. `pdf-path` (optional) — path to a specific PDF file. If omitted, list all PDFs in `data/books/es/pdfs/` and let the user pick, or process the next unprocessed one.

## Steps

### 0. Find the PDF to process

If no `pdf-path` argument is given:

1. Glob `data/books/es/pdfs/**/*.pdf` to list all available PDFs
2. Glob `data/books/*.json` to list already-processed books
3. Show the user which PDFs are available and which have already been converted
4. Pick the next unprocessed PDF, or ask the user which one to process if multiple remain

### 1. Extract raw text from the PDF

Run the extraction helper:

```bash
npx tsx scripts/extract-pdf-text.ts <pdf-path>
```

This outputs the raw text content of the PDF to stdout. Capture and read the output.

### 2. Infer book metadata

From the extracted text and the PDF filename, infer ALL of the following:

- **slug**: URL-friendly identifier derived from the title (e.g. `el-viejo-y-el-mar`). Lowercase, hyphens, no accents.
- **title**: Full book title as it appears in the text (e.g. "El viejo y el mar")
- **author**: Author name as it appears in the text or as you recognize from the work
- **emoji**: A single emoji that represents the book's theme or content (e.g. 🎣 for a fishing story, 🗡️ for an adventure)
- **description**: A 1-2 sentence description of the book **in Spanish**, suitable for a book card
- **difficulty**: One of `beginner`, `intermediate`, `advanced` — judge based on vocabulary complexity, sentence length, and literary style

Use your knowledge of Spanish literature to fill in any gaps. If the PDF title page has the info, prefer that.

### 3. Analyze and structure the text

Read the extracted text carefully and:

- **Identify chapters**: Look for chapter headings (e.g., "Capítulo 1", "I", "Capítulo primero", numbered sections, or other structural markers). Use the original chapter titles from the book.
- **Clean PDF artifacts**: Remove page numbers, running headers/footers, broken hyphenations (re-join hyphenated words split across lines), excessive whitespace, and any non-content text.
- **Split into sentences**: Split the text into individual sentences following Spanish punctuation rules:
  - Sentence boundaries: `.` `!` `?` followed by space and uppercase letter
  - Respect opening marks: `¡` `¿`
  - Keep quoted dialogue together when appropriate
  - Don't split on abbreviations (Sr., Sra., Dr., etc.)
  - Each sentence should be a complete, readable unit

### 4. Write the book JSON

Write the output to `data/books/<slug>.json` following this structure (matching the `Book` interface in `lib/books.ts`):

```json
{
  "slug": "<slug>",
  "title": "<title>",
  "author": "<author>",
  "emoji": "<emoji>",
  "description": "<description>",
  "language": "es",
  "difficulty": "<difficulty>",
  "chapterCount": <number>,
  "sentenceCount": <total across all chapters>,
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title",
      "sentences": [
        { "id": "a1b2c3d4", "text": "First sentence." },
        { "id": "e5f6a7b8", "text": "Second sentence." }
      ]
    }
  ]
}
```

### 5. Add to book index

Edit `data/books/index.ts` to add a new entry to the `bookIndex` array:

```typescript
{
  slug: "<slug>",
  title: "<title>",
  author: "<author>",
  emoji: "<emoji>",
  description: "<description>",
  language: "es",
  difficulty: "<difficulty>",
  chapterCount: <number>,
  sentenceCount: <number>,
},
```

### 6. Verify

- Confirm the JSON is valid by reading it back
- Check that `chapterCount` and `sentenceCount` match the actual content
- Ensure no empty chapters or sentences exist

## Quality Guidelines

- Each sentence must have a deterministic `id` field: `SHA-256("<chapter_number>:<sentence_index>:<text>").hex().substring(0, 8)`. Use Node's `crypto` module. This ID is used for translation alignment verification.
- Sentences should be 1-3 lines of natural text (not too short, not too long)
- If a sentence is extremely long (>500 chars), consider whether it should be split at natural clause boundaries
- Preserve the original Spanish text faithfully -- do not translate or modify the content
- Chapter titles should match the original book's chapter titles where possible
