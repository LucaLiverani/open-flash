import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";

interface ProgressRow {
  book_slug: string;
  chapter_number: number;
  sentence_index: number;
  completed: number;
  updated_at: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const book = searchParams.get("book");

  if (!book) {
    return NextResponse.json(
      { error: "book query param is required" },
      { status: 400 }
    );
  }

  try {
    const db = await getDB();
    const rows = await db
      .prepare(
        "SELECT book_slug, chapter_number, sentence_index, completed, updated_at FROM reading_progress WHERE book_slug = ?"
      )
      .bind(book)
      .all<ProgressRow>();

    return NextResponse.json({ progress: rows.results });
  } catch (error) {
    console.error("Progress GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    book_slug: string;
    chapter_number: number;
    sentence_index: number;
    completed?: boolean;
  };
  const { book_slug, chapter_number, sentence_index } = body;
  const completed = body.completed ? 1 : 0;

  if (!book_slug || chapter_number == null || sentence_index == null) {
    return NextResponse.json(
      { error: "book_slug, chapter_number, and sentence_index are required" },
      { status: 400 }
    );
  }

  try {
    const db = await getDB();
    const id = `${book_slug}:${chapter_number}`;

    await db
      .prepare(
        `INSERT INTO reading_progress (id, book_slug, chapter_number, sentence_index, completed, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(book_slug, chapter_number) DO UPDATE SET
           sentence_index = excluded.sentence_index,
           completed = excluded.completed,
           updated_at = datetime('now')`
      )
      .bind(id, book_slug, chapter_number, sentence_index, completed)
      .run();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Progress POST error:", error);
    return NextResponse.json(
      { error: "Failed to save progress" },
      { status: 500 }
    );
  }
}
