import { useEffect, useState } from 'react';
import { flavorLinesFor } from '../config/loadingFlavor';

const ROTATE_MS = 4500;

/**
 * Rotating flavor for the long wait after the quiz.
 * Genre picks the voice; this is atmosphere, not status.
 */
export default function LoadingFlavor({ genre }) {
  const lines = flavorLinesFor(genre);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const id = setInterval(() => {
      setIndex(i => (i + 1) % lines.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [genre, lines.length]);

  return (
    <p className="ui-subtitle m-0 italic" aria-live="polite">
      {lines[index]}
    </p>
  );
}
