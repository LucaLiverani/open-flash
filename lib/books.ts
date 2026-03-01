// --- Book Types ---

export interface BookSentence {
  id: string;
  text: string;
  translations?: Record<string, string>;
}

export interface BookChapter {
  number: number;
  title: string;
  sentences: BookSentence[];
}

export interface BookMeta {
  slug: string;
  title: string;
  author: string;
  emoji: string;
  description: string;
  language: "es";
  difficulty: "beginner" | "intermediate" | "advanced";
  chapterCount: number;
  sentenceCount: number;
}

export interface Book extends BookMeta {
  chapters: BookChapter[];
}

// --- Book Helpers ---

import { bookIndex } from "@/data/books/index";

export function getBookList(): BookMeta[] {
  return bookIndex;
}

export async function getBook(slug: string): Promise<Book | null> {
  try {
    const mod = await import(`@/data/books/${slug}.json`);
    return (mod.default ?? mod) as Book;
  } catch {
    return null;
  }
}

export async function getChapter(
  slug: string,
  chapterNum: number
): Promise<BookChapter | null> {
  const book = await getBook(slug);
  if (!book) return null;
  return book.chapters.find((c) => c.number === chapterNum) ?? null;
}
