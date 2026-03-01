#!/usr/bin/env npx tsx
/**
 * prepare-book.ts — Convert raw Spanish text into structured book JSON.
 *
 * Usage:
 *   npx tsx scripts/prepare-book.ts \
 *     --slug "don-quijote" \
 *     --title "Don Quijote de la Mancha" \
 *     --author "Miguel de Cervantes" \
 *     --emoji "🗡️" \
 *     --description "La historia del ingenioso hidalgo..." \
 *     --difficulty "advanced" \
 *     --input raw-text.txt
 *
 * The input text should use lines like "CHAPTER: <title>" as chapter delimiters.
 * If no chapter delimiters are found, the entire text is treated as a single chapter.
 *
 * Output is written to stdout as JSON. Redirect to data/books/<slug>.json.
 */

import * as crypto from "crypto";
import * as fs from "fs";

function sentenceId(chapterNumber: number, sentenceIndex: number, text: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(`${chapterNumber}:${sentenceIndex}:${text}`);
  return hash.digest("hex").substring(0, 8);
}

interface BookSentence {
  id: string;
  text: string;
}

interface BookChapter {
  number: number;
  title: string;
  sentences: BookSentence[];
}

interface Book {
  slug: string;
  title: string;
  author: string;
  emoji: string;
  description: string;
  language: "es";
  difficulty: "beginner" | "intermediate" | "advanced";
  chapterCount: number;
  sentenceCount: number;
  chapters: BookChapter[];
}

function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace.
  // Handles: . ! ? » " and common abbreviations.
  const raw = text
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const sentences: string[] = [];
  // Match sentence-ending patterns: period/exclamation/question followed by
  // space + uppercase or end of string. Also handles quotes and guillemets.
  const parts = raw.split(/(?<=[.!?»"'])\s+(?=[A-ZÁÉÍÓÚÑ¡¿«"'])/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length > 0) {
      sentences.push(trimmed);
    }
  }

  return sentences;
}

function parseChapters(
  text: string
): { title: string; body: string }[] {
  const chapterPattern = /^CHAPTER:\s*(.+)$/gm;
  const matches = [...text.matchAll(chapterPattern)];

  if (matches.length === 0) {
    return [{ title: "Capítulo 1", body: text.trim() }];
  }

  const chapters: { title: string; body: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const title = matches[i][1].trim();
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    const body = text.slice(start, end).trim();
    if (body.length > 0) {
      chapters.push({ title, body });
    }
  }

  return chapters;
}

function main() {
  const args = process.argv.slice(2);
  const flags: Record<string, string> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, "");
    flags[key] = args[i + 1];
  }

  const required = ["slug", "title", "author", "emoji", "description", "difficulty", "input"];
  for (const key of required) {
    if (!flags[key]) {
      console.error(`Missing required flag: --${key}`);
      console.error(
        "Usage: npx tsx scripts/prepare-book.ts --slug <slug> --title <title> --author <author> --emoji <emoji> --description <desc> --difficulty <diff> --input <file>"
      );
      process.exit(1);
    }
  }

  const rawText = fs.readFileSync(flags.input, "utf-8");
  const rawChapters = parseChapters(rawText);

  const chapters: BookChapter[] = rawChapters.map((ch, i) => ({
    number: i + 1,
    title: ch.title,
    sentences: splitIntoSentences(ch.body).map((text, si) => ({
      id: sentenceId(i + 1, si, text),
      text,
    })),
  }));

  const totalSentences = chapters.reduce(
    (sum, ch) => sum + ch.sentences.length,
    0
  );

  const book: Book = {
    slug: flags.slug,
    title: flags.title,
    author: flags.author,
    emoji: flags.emoji,
    description: flags.description,
    language: "es",
    difficulty: flags.difficulty as Book["difficulty"],
    chapterCount: chapters.length,
    sentenceCount: totalSentences,
    chapters,
  };

  console.log(JSON.stringify(book, null, 2));
}

main();
