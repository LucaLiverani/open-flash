#!/usr/bin/env npx tsx
/**
 * generate-sentence-ids.ts — Add deterministic hash IDs to book sentences.
 *
 * Usage:
 *   npx tsx scripts/generate-sentence-ids.ts [book.json ...]
 *
 * If no arguments are given, processes all data/books/*.json files.
 *
 * ID formula: SHA-256("<chapter_number>:<sentence_index>:<text>").hex().substring(0, 8)
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

function sentenceId(chapterNumber: number, sentenceIndex: number, text: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(`${chapterNumber}:${sentenceIndex}:${text}`);
  return hash.digest("hex").substring(0, 8);
}

function processBook(filePath: string): void {
  const raw = fs.readFileSync(filePath, "utf-8");
  const book = JSON.parse(raw);

  const allIds = new Set<string>();
  let added = 0;

  for (const chapter of book.chapters) {
    for (let si = 0; si < chapter.sentences.length; si++) {
      const sentence = chapter.sentences[si];
      const id = sentenceId(chapter.number, si, sentence.text);

      if (allIds.has(id)) {
        throw new Error(
          `Duplicate ID ${id} in ${path.basename(filePath)} — ` +
          `chapter ${chapter.number}, sentence ${si}: "${sentence.text.substring(0, 50)}..."`
        );
      }
      allIds.add(id);

      if (sentence.id !== id) {
        sentence.id = id;
        added++;
      }

      // Ensure id is the first key
      chapter.sentences[si] = { id: sentence.id, ...sentence };
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(book, null, 2) + "\n");
  console.log(`${path.basename(filePath)}: ${allIds.size} sentences, ${added} IDs added/updated`);
}

function main() {
  const args = process.argv.slice(2);

  let files: string[];
  if (args.length > 0) {
    files = args;
  } else {
    const booksDir = path.resolve(__dirname, "../data/books");
    files = fs.readdirSync(booksDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.join(booksDir, f));
  }

  if (files.length === 0) {
    console.error("No book JSON files found.");
    process.exit(1);
  }

  for (const file of files) {
    processBook(file);
  }

  console.log("Done — all books processed with zero collisions.");
}

main();
