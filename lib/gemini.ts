import { LANGUAGES, type LanguageCode } from "./db";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

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
