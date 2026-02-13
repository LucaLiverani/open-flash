import { LANGUAGES, type LanguageCode } from "./db";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const TTS_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent";

async function getApiKey(): Promise<string> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext();
    if ((env as unknown as Record<string, unknown>).GEMINI_API_KEY) {
      return (env as unknown as Record<string, unknown>).GEMINI_API_KEY as string;
    }
  } catch {
    // Not in Cloudflare context
  }
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  throw new Error("GEMINI_API_KEY not configured");
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

interface TranslateResult {
  translation: string;
  exampleSentence: string;
  emoji: string;
}

export async function translateWord(
  word: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode
): Promise<TranslateResult> {
  const apiKey = await getApiKey();
  const sourceName = LANGUAGES[sourceLang];
  const targetName = LANGUAGES[targetLang];

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Translate the ${sourceName} word "${word}" to ${targetName}. Provide:
1. The translation in ${targetName}
2. An example sentence in ${sourceName} using the original word
3. A single emoji that represents the word

Respond in the exact JSON format specified.`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            translation: { type: "STRING" },
            exampleSentence: { type: "STRING" },
            emoji: { type: "STRING" },
          },
          required: ["translation", "exampleSentence", "emoji"],
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${text}`);
  }

  const data = await response.json() as GeminiResponse;
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error("No content in Gemini response");
  }

  return JSON.parse(content) as TranslateResult;
}

interface BulkCardResult {
  word: string;
  translation: string;
  exampleSentence: string;
  emoji: string;
}

export async function generateBulkCards(
  prompt: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
  count: number = 10
): Promise<BulkCardResult[]> {
  const apiKey = await getApiKey();
  const sourceName = LANGUAGES[sourceLang];
  const targetName = LANGUAGES[targetLang];

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Generate ${count} vocabulary flashcards for the topic: "${prompt}".
Source language: ${sourceName}
Target language: ${targetName}

For each card provide:
1. A word in ${sourceName}
2. Its translation in ${targetName}
3. An example sentence in ${sourceName} using the word
4. A single emoji representing the word

Return an array of objects in the exact JSON format specified.`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              word: { type: "STRING" },
              translation: { type: "STRING" },
              exampleSentence: { type: "STRING" },
              emoji: { type: "STRING" },
            },
            required: ["word", "translation", "exampleSentence", "emoji"],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${text}`);
  }

  const data = await response.json() as GeminiResponse;
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error("No content in Gemini response");
  }

  return JSON.parse(content) as BulkCardResult[];
}

// --- Text-to-Speech via Gemini TTS ---

interface TtsResponse {
  candidates?: {
    content?: {
      parts?: { inlineData?: { data?: string } }[];
    };
    finishReason?: string;
  }[];
}

const MAX_TTS_RETRIES = 2;

export async function textToSpeech(text: string, lang: string): Promise<Uint8Array> {
  const apiKey = await getApiKey();

  const langName = LANGUAGES[lang as LanguageCode] ?? lang;
  const prompt = `Say in ${langName}, clearly and naturally: ${text}`;

  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: "Kore" },
        },
      },
    },
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_TTS_RETRIES; attempt++) {
    const response = await fetch(`${TTS_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      lastError = new Error(
        `Gemini TTS error: ${response.status} ${errorText}`
      );
      // Don't retry on client errors (4xx) — only retry on server errors (5xx)
      if (response.status < 500) throw lastError;
      continue;
    }

    const data = (await response.json()) as TtsResponse;
    const base64Audio =
      data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (base64Audio) {
      // Decode base64 to raw PCM bytes
      const pcmBytes = Uint8Array.from(atob(base64Audio), (c) =>
        c.charCodeAt(0)
      );
      // Wrap in WAV header (24 kHz, mono, 16-bit)
      return pcmToWav(pcmBytes, 24000, 1, 16);
    }

    // Log the unexpected shape so we can debug
    console.warn(
      `TTS attempt ${attempt + 1}/${MAX_TTS_RETRIES}: no audio data. Response keys:`,
      JSON.stringify(Object.keys(data)),
      "finishReason:",
      data.candidates?.[0]?.finishReason ?? "none"
    );
    lastError = new Error("No audio in Gemini TTS response");
  }

  throw lastError!;
}

function pcmToWav(
  pcm: Uint8Array,
  sampleRate: number,
  channels: number,
  bitsPerSample: number
): Uint8Array {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const dataSize = pcm.length;
  const buffer = new Uint8Array(44 + dataSize);
  const v = new DataView(buffer.buffer);

  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  v.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, channels, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, byteRate, true);
  v.setUint16(32, blockAlign, true);
  v.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  v.setUint32(40, dataSize, true);
  buffer.set(pcm, 44);

  return buffer;
}
