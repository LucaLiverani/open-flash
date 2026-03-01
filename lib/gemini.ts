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

export async function translateSentence(
  sentence: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode
): Promise<string> {
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
              text: `Translate this ${sourceName} sentence to ${targetName}: "${sentence}". Return only the translation, nothing else.`,
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
          },
          required: ["translation"],
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

  return (JSON.parse(content) as { translation: string }).translation;
}

// --- Story Generation ---

export interface StoryResult {
  title: string;
  sentences: string[];
  translation: string;
}

export async function generateStory(opts: {
  language: LanguageCode;
  nativeLang: LanguageCode;
  topic: string;
  difficulty: "beginner" | "intermediate";
  words?: string[];
}): Promise<StoryResult> {
  const apiKey = await getApiKey();
  const langName = LANGUAGES[opts.language];
  const nativeLangName = LANGUAGES[opts.nativeLang];

  const wordLength = opts.difficulty === "beginner" ? "100-120" : "120-150";
  const level =
    opts.difficulty === "beginner"
      ? "A1-A2 level: simple vocabulary, present tense, short sentences"
      : "B1 level: varied vocabulary, mixed tenses, more complex sentences";

  const wordsInstruction = opts.words?.length
    ? `\nIMPORTANT: Naturally incorporate these words into the story: ${opts.words.join(", ")}. Use each word at least once.`
    : "";

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Write a short story in ${langName} about "${opts.topic}".

Requirements:
- ${wordLength} words total
- ${level}
- Split the story into individual sentences and return them as an array
- Each array element should be exactly one sentence
- Provide a title in ${langName}
- Provide a full translation of the entire story in ${nativeLangName}${wordsInstruction}

Return in the exact JSON format specified.`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            sentences: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
            translation: { type: "STRING" },
          },
          required: ["title", "sentences", "translation"],
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error("No content in Gemini response");
  }

  return JSON.parse(content) as StoryResult;
}

// --- Verb Conjugation ---

export interface ConjugationForm {
  person: string;
  conjugation: string;
}

export interface ConjugationTense {
  tense: string;
  forms: ConjugationForm[];
  exampleSentence?: string;
}

export interface ConjugationResult {
  infinitive: string;
  meaning: string;
  language: string;
  isVerb: boolean;
  note: string;
  tenses: ConjugationTense[];
}

export async function getLanguageTenses(language: string): Promise<string[]> {
  const apiKey = await getApiKey();
  const langName = LANGUAGES[language as LanguageCode] ?? language;

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `List the most common and important verb tenses/moods for ${langName}. Use the tense names in ${langName} (e.g. for Italian: "Presente Indicativo", not "Present Indicative"). Include indicative, subjunctive, conditional, and imperative moods where applicable. Return 8-15 tenses ordered by importance/frequency of use.`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: { type: "STRING" },
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

  return JSON.parse(content) as string[];
}

export async function conjugateVerb(
  verb: string,
  language: string,
  tenses: string[],
  targetLang?: string
): Promise<ConjugationResult> {
  const apiKey = await getApiKey();
  const langName = LANGUAGES[language as LanguageCode] ?? language;
  const targetLangName = targetLang
    ? (LANGUAGES[targetLang as LanguageCode] ?? targetLang)
    : "English";

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Conjugate the ${langName} verb "${verb}" for ONLY these tenses: ${JSON.stringify(tenses)}.

Rules:
- If the input is not a verb, set isVerb to false and leave tenses empty.
- Use person labels in ${langName} (e.g. for Italian: "io", "tu", "lui/lei", "noi", "voi", "loro").
- The "infinitive" field should be the canonical infinitive form of the verb.
- The "meaning" field should be the ${targetLangName} translation (e.g. "to eat").
- The "note" field can contain edge case notes (e.g. "Chinese verbs don't conjugate") or be empty.
- Only generate conjugations for the tenses listed above, in the same order.
- For each tense, include an "exampleSentence": a natural example sentence in ${langName} that uses the verb conjugated in that tense.`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            infinitive: { type: "STRING" },
            meaning: { type: "STRING" },
            language: { type: "STRING" },
            isVerb: { type: "BOOLEAN" },
            note: { type: "STRING" },
            tenses: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  tense: { type: "STRING" },
                  forms: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        person: { type: "STRING" },
                        conjugation: { type: "STRING" },
                      },
                      required: ["person", "conjugation"],
                    },
                  },
                  exampleSentence: { type: "STRING" },
                },
                required: ["tense", "forms", "exampleSentence"],
              },
            },
          },
          required: ["infinitive", "meaning", "language", "isVerb", "note", "tenses"],
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

  return JSON.parse(content) as ConjugationResult;
}

// --- Verb Exercise Generation ---

export interface VerbExerciseResult {
  sentence: string;
  blankedSentence: string;
  answer: string;
  person: string;
  hint: string;
  translation: string;
}

export async function generateVerbExercise(
  infinitive: string,
  language: string,
  tense: string,
  person: string,
  conjugation: string,
  meaning: string,
  translationLang?: string
): Promise<VerbExerciseResult> {
  const apiKey = await getApiKey();
  const langName = LANGUAGES[language as LanguageCode] ?? language;
  const translationLangName = translationLang
    ? (LANGUAGES[translationLang as LanguageCode] ?? translationLang)
    : "English";

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Generate a natural sentence in ${langName} using the verb "${infinitive}" conjugated as "${conjugation}" (${tense}, ${person}).

Rules:
- The sentence should be natural and conversational.
- Return the full sentence with the conjugated form included.
- Return a "blankedSentence" where the conjugated form "${conjugation}" is replaced with "___".
- The "answer" field must be exactly "${conjugation}".
- The "person" field must be "${person}".
- The "hint" field should be: "${infinitive} (${meaning}) — ${tense}, ${person}".
- The "translation" field should be the ${translationLangName} translation of the full sentence.`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            sentence: { type: "STRING" },
            blankedSentence: { type: "STRING" },
            answer: { type: "STRING" },
            person: { type: "STRING" },
            hint: { type: "STRING" },
            translation: { type: "STRING" },
          },
          required: ["sentence", "blankedSentence", "answer", "person", "hint", "translation"],
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

  return JSON.parse(content) as VerbExerciseResult;
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

export async function textToSpeech(text: string, lang: string, voice: string = "Kore"): Promise<Uint8Array> {
  const apiKey = await getApiKey();

  const langName = LANGUAGES[lang as LanguageCode] ?? lang;
  const prompt = `Say in ${langName}, clearly and naturally: ${text}`;

  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
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

// --- Bulk Chapter Translation ---

export async function translateChapterBulk(
  sentences: string[],
  sourceLang: LanguageCode,
  targetLang: LanguageCode
): Promise<string[]> {
  const apiKey = await getApiKey();
  const sourceName = LANGUAGES[sourceLang];
  const targetName = LANGUAGES[targetLang];

  const numbered = sentences
    .map((s, i) => `${i + 1}. ${s}`)
    .join("\n");

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Translate each of the following ${sourceName} sentences to ${targetName}. Return an array of strings where each element is the translation of the corresponding numbered sentence. Maintain the same order and count.

${numbered}`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: { type: "STRING" },
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error("No content in Gemini response");
  }

  const translations = JSON.parse(content) as string[];
  if (translations.length !== sentences.length) {
    console.warn(
      `Translation count mismatch: expected ${sentences.length}, got ${translations.length}`
    );
  }

  return translations;
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
