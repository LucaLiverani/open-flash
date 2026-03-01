import { NextResponse } from "next/server";
import { translateChapterBulk } from "@/lib/gemini";
import type { LanguageCode } from "@/lib/db";

function cacheKey(
  bookSlug: string,
  chapter: number,
  sourceLang: string,
  targetLang: string
): string {
  const encoded = encodeURIComponent(
    `shadowing-translate:${bookSlug}:${chapter}:${sourceLang}:${targetLang}`
  );
  return `https://translate-cache.internal/${encoded}`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    sentences: string[];
    sourceLang: string;
    targetLang: string;
    bookSlug?: string;
    chapter?: number;
  };
  const { sentences, sourceLang, targetLang, bookSlug, chapter } = body;

  if (!sentences?.length || !sourceLang || !targetLang) {
    return NextResponse.json(
      { error: "sentences, sourceLang, and targetLang are required" },
      { status: 400 }
    );
  }

  // Try Cloudflare Cache if book/chapter info is provided
  const cache =
    typeof caches !== "undefined"
      ? (caches as unknown as { default: Cache }).default
      : null;

  if (cache && bookSlug && chapter != null) {
    const key = cacheKey(bookSlug, chapter, sourceLang, targetLang);
    const cached = await cache.match(key);
    if (cached) return cached;

    try {
      const translations = await translateChapterBulk(
        sentences,
        sourceLang as LanguageCode,
        targetLang as LanguageCode
      );

      const response = NextResponse.json({ translations });
      const cacheResponse = new Response(JSON.stringify({ translations }), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=2592000",
        },
      });
      cache.put(key, cacheResponse).catch(() => {});

      return response;
    } catch (error) {
      console.error("Bulk translate error:", error);
      return NextResponse.json(
        { error: "Failed to translate sentences" },
        { status: 500 }
      );
    }
  }

  // No cache available — translate directly
  try {
    const translations = await translateChapterBulk(
      sentences,
      sourceLang as LanguageCode,
      targetLang as LanguageCode
    );
    return NextResponse.json({ translations });
  } catch (error) {
    console.error("Bulk translate error:", error);
    return NextResponse.json(
      { error: "Failed to translate sentences" },
      { status: 500 }
    );
  }
}
