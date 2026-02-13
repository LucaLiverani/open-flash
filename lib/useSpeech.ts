"use client";

import { useState, useCallback, useEffect, useRef } from "react";

// Shared across all hook instances so navigating between cards reuses cache
const audioCache = new Map<string, Blob>();
const inflightRequests = new Map<string, Promise<Blob>>();

function fetchTtsBlob(text: string, lang: string, signal?: AbortSignal): Promise<Blob> {
  const cacheKey = `${lang}:${text}`;
  const cached = audioCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  // Deduplicate concurrent requests for the same text
  const inflight = inflightRequests.get(cacheKey);
  if (inflight) return inflight;

  const promise = fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang }),
    signal,
  })
    .then((res) => {
      if (!res.ok) throw new Error("TTS request failed");
      return res.blob();
    })
    .then((blob) => {
      audioCache.set(cacheKey, blob);
      inflightRequests.delete(cacheKey);
      return blob;
    })
    .catch((e) => {
      inflightRequests.delete(cacheKey);
      throw e;
    });

  inflightRequests.set(cacheKey, promise);
  return promise;
}

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const prefetch = useCallback((text: string, lang: string) => {
    if (!text || !lang) return;
    fetchTtsBlob(text, lang).catch(() => {});
  }, []);

  const speak = useCallback(
    async (text: string, lang: string) => {
      if (!text || !lang) return;

      stop();

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setIsSpeaking(true);

        const blob = await fetchTtsBlob(text, lang, controller.signal);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          urlRef.current = null;
          setIsSpeaking(false);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          urlRef.current = null;
          setIsSpeaking(false);
        };

        await audio.play();
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setIsSpeaking(false);
        }
      }
    },
    [stop]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { speak, stop, prefetch, isSpeaking, isSupported: true };
}
