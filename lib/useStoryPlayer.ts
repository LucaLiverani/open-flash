"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { fetchTtsBlob } from "./useSpeech";

export function useStoryPlayer(sentences: string[], lang: string) {
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const pausedRef = useRef(false);
  const stoppedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const prefetchSentence = useCallback(
    (index: number) => {
      if (index >= 0 && index < sentences.length) {
        fetchTtsBlob(sentences[index], lang).catch(() => {});
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

      // Prefetch next sentence
      if (index + 1 < sentences.length) {
        prefetchSentence(index + 1);
      }

      try {
        const blob = await fetchTtsBlob(sentences[index], lang);
        if (stoppedRef.current) return;

        const url = URL.createObjectURL(blob);
        urlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          urlRef.current = null;
          if (!pausedRef.current && !stoppedRef.current) {
            playSentence(index + 1);
          }
        };

        audio.onerror = () => {
          URL.revokeObjectURL(url);
          urlRef.current = null;
          setIsPlaying(false);
        };

        await audio.play();
      } catch {
        if (!stoppedRef.current) {
          setIsPlaying(false);
        }
      }
    },
    [sentences, lang, cleanup, prefetchSentence]
  );

  const play = useCallback(() => {
    if (audioRef.current && pausedRef.current) {
      pausedRef.current = false;
      setIsPlaying(true);
      audioRef.current.play();
    } else {
      const startIndex = activeSentenceIndex >= 0 ? activeSentenceIndex : 0;
      playSentence(startIndex);
    }
  }, [activeSentenceIndex, playSentence]);

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

  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      cleanup();
    };
  }, [cleanup]);

  return { activeSentenceIndex, isPlaying, play, pause, jumpTo, stop };
}
