#!/usr/bin/env npx tsx
/**
 * extract-pdf-text.ts — Extract raw text from a PDF file.
 *
 * Usage:
 *   npx tsx scripts/extract-pdf-text.ts <pdf-path>
 *
 * Outputs the extracted text to stdout.
 */

import * as fs from "fs";
import { PDFParse } from "pdf-parse";

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error("Usage: npx tsx scripts/extract-pdf-text.ts <pdf-path>");
    process.exit(1);
  }

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const parser = new PDFParse({ data });
  const result = await parser.getText();
  process.stdout.write(result.text);
  await parser.destroy();
}

main();
