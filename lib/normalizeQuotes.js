/** Normalize typographic quote characters to straight ASCII double quotes. */
export function normalizeQuotes(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/[\u201C\u201E\u00AB]/g, '"')
    .replace(/[\u201D\u201F\u00BB]/g, '"');
}
