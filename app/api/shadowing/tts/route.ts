import { textToSpeech } from "@/lib/gemini";

function cacheKey(text: string, lang: string, voice: string): string {
  const encoded = encodeURIComponent(`shadowing:${voice}:${lang}:${text}`);
  return `https://tts-cache.internal/${encoded}`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    text: string;
    lang: string;
    voice?: string;
  };
  const { text, lang } = body;
  const voice = body.voice || "Orus";

  if (!text || !lang) {
    return new Response(
      JSON.stringify({ error: "text and lang are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const key = cacheKey(text, lang, voice);

  // Cloudflare Cache (only in Workers runtime)
  const cache =
    typeof caches !== "undefined"
      ? (caches as unknown as { default: Cache }).default
      : null;
  if (cache) {
    const cached = await cache.match(key);
    if (cached) return cached;
  }

  try {
    const wavBytes = await textToSpeech(text, lang, voice);

    const response = new Response(wavBytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "public, max-age=2592000",
      },
    });

    cache?.put(key, response.clone()).catch(() => {});

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Shadowing TTS error: ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
