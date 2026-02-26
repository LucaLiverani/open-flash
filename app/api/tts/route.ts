function cacheKey(text: string, lang: string): string {
  const encoded = encodeURIComponent(`${lang}:${text}`);
  return `https://tts-cache.internal/${encoded}`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as { text: string; lang: string };
  const { text, lang } = body;

  if (!text || !lang) {
    return new Response(JSON.stringify({ error: "text and lang are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const key = cacheKey(text, lang);

  // Check Cloudflare Cache (only available in Workers runtime)
  const cache = typeof caches !== "undefined"
    ? (caches as unknown as { default: Cache }).default
    : null;
  if (cache) {
    const cached = await cache.match(key);
    if (cached) return cached;
  }

  try {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`Google TTS error: ${res.status}`);

    const blob = await res.blob();
    const response = new Response(blob, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=2592000",
      },
    });

    cache?.put(key, response.clone()).catch(() => {});

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`TTS error: ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
