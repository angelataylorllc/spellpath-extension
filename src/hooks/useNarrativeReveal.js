import { useState, useEffect, useCallback, useRef } from 'react';

const CHAR_MS = 14;
const PARAGRAPH_PAUSE_MS = 350;

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useNarrativeReveal(paragraphs, narrativeKey) {
  const [paragraphIndex, setParagraphIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [complete, setComplete] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const timersRef = useRef([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const skip = useCallback(() => {
    clearTimers();
    setSkipped(true);
    setParagraphIndex(Math.max(paragraphs.length - 1, 0));
    setCharIndex(paragraphs[paragraphs.length - 1]?.length ?? 0);
    setComplete(true);
  }, [clearTimers, paragraphs]);

  useEffect(() => {
    clearTimers();
    setParagraphIndex(0);
    setCharIndex(0);
    setComplete(false);
    setSkipped(false);

    if (!paragraphs.length) {
      setComplete(true);
      return;
    }

    if (prefersReducedMotion()) {
      setParagraphIndex(paragraphs.length - 1);
      setCharIndex(paragraphs[paragraphs.length - 1].length);
      setComplete(true);
    }
  }, [narrativeKey, clearTimers, paragraphs]);

  useEffect(() => {
    if (skipped || complete || !paragraphs.length || prefersReducedMotion()) return;

    const current = paragraphs[paragraphIndex] ?? '';

    if (charIndex < current.length) {
      const t = setTimeout(() => setCharIndex(c => c + 1), CHAR_MS);
      timersRef.current.push(t);
      return () => clearTimeout(t);
    }

    if (paragraphIndex < paragraphs.length - 1) {
      const t = setTimeout(() => {
        setParagraphIndex(i => i + 1);
        setCharIndex(0);
      }, PARAGRAPH_PAUSE_MS);
      timersRef.current.push(t);
      return () => clearTimeout(t);
    }

    setComplete(true);
  }, [paragraphIndex, charIndex, paragraphs, skipped, complete]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const visibleParagraphs = paragraphs
    .map((text, i) => {
      if (skipped || complete) return text;
      if (i < paragraphIndex) return text;
      if (i === paragraphIndex) return text.slice(0, charIndex);
      return '';
    })
    .filter((_, i) => skipped || complete || i <= paragraphIndex);

  const isTyping = !complete && !skipped && paragraphs.length > 0;

  return { visibleParagraphs, complete, skip, isTyping };
}
