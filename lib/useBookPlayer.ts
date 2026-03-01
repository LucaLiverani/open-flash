"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// Client-side blob cache for shadowing TTS audio
const audioCache = new Map<string, Blob>();
const inflightRequests = new Map<string, Promise<Blob>>();

function fetchShadowingTts(
  text: string,
  lang: string,
  signal?: AbortSignal
): Promise<Blob> {
  const cacheKey = `shadowing:${lang}:${text}`;
  const cached = audioCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const inflight = inflightRequests.get(cacheKey);
  if (inflight) return inflight;

  const promise = fetch("/api/shadowing/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang }),
    signal,
  })
    .then((res) => {
      if (!res.ok) throw new Error("Shadowing TTS request failed");
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

export type PlaybackSpeed = 0.75 | 1 | 1.25;

export function useBookPlayer(
  sentences: string[],
  lang: string,
  onSentenceChange?: (index: number) => void
) {
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);

  // Persistent Audio element for mobile compatibility
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const pausedRef = useRef(false);
  const stoppedRef = useRef(false);
  const speedRef = useRef<PlaybackSpeed>(1);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    return audioRef.current;
  }, []);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const prefetchSentence = useCallback(
    (index: number) => {
      if (index >= 0 && index < sentences.length) {
        fetchShadowingTts(sentences[index], lang).catch(() => {});
      }
    },
    [sentences, lang]
  );

  const playSentence = useCallback(
    async (index: number) => {
      if (index < 0 || index >= sentences.length) {
        cleanup();
        setIsPlaying(false);
        setActiveSentenceIndex(-1);
        return;
      }

      cleanup();
      stoppedRef.current = false;
      pausedRef.current = false;
      setActiveSentenceIndex(index);
      setIsPlaying(true);
      onSentenceChange?.(index);

      // Prefetch next 2 sentences
      prefetchSentence(index + 1);
      prefetchSentence(index + 2);

      try {
        const blob = await fetchShadowingTts(sentences[index], lang);
        if (stoppedRef.current) return;

        const url = URL.createObjectURL(blob);
        urlRef.current = url;

        const audio = getAudio();
        audio.playbackRate = speedRef.current;

        audio.onended = () => {
          if (urlRef.current === url) {
            URL.revokeObjectURL(url);
            urlRef.current = null;
          }
          if (!pausedRef.current && !stoppedRef.current) {
            playSentence(index + 1);
          }
        };

        audio.onerror = () => {
          if (urlRef.current === url) {
            URL.revokeObjectURL(url);
            urlRef.current = null;
          }
          setIsPlaying(false);
        };

        audio.src = url;
        await audio.play();
      } catch {
        if (!stoppedRef.current) {
          setIsPlaying(false);
        }
      }
    },
    [sentences, lang, cleanup, prefetchSentence, getAudio, onSentenceChange]
  );

  const play = useCallback(() => {
    const audio = getAudio();
    if (pausedRef.current) {
      pausedRef.current = false;
      setIsPlaying(true);
      audio.play();
    } else {
      const startIndex = activeSentenceIndex >= 0 ? activeSentenceIndex : 0;
      playSentence(startIndex);
    }
  }, [activeSentenceIndex, playSentence, getAudio]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    setIsPlaying(false);
    audioRef.current?.pause();
  }, []);

  const jumpTo = useCallback(
    (index: number) => {
      stoppedRef.current = false;
      pausedRef.current = false;
      playSentence(index);
    },
    [playSentence]
  );

  const stop = useCallback(() => {
    stoppedRef.current = true;
    pausedRef.current = false;
    cleanup();
    setIsPlaying(false);
    setActiveSentenceIndex(-1);
  }, [cleanup]);

  const changeSpeed = useCallback(
    (speed: PlaybackSpeed) => {
      speedRef.current = speed;
      setPlaybackSpeed(speed);
      if (audioRef.current) {
        audioRef.current.playbackRate = speed;
      }
    },
    []
  );

  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      cleanup();
      audioRef.current = null;
    };
  }, [cleanup]);

  return {
    activeSentenceIndex,
    isPlaying,
    playbackSpeed,
    play,
    pause,
    jumpTo,
    stop,
    setPlaybackSpeed: changeSpeed,
  };
}
