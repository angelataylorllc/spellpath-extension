const STOP = new Set([
  'and', 'the', 'how', 'it', 'its', 'a', 'an', 'of', 'for', 'to', 'in',
  'with', 'from', 'into', 'that', 'this', 'or', 'on', 'as', 'by',
]);

/** Compact comparable form of a concept/label. */
export function conceptKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(w => w.length > 1 && !STOP.has(w))
    .join(' ')
    .trim();
}

/** True when two concept strings name the same idea (including truncation). */
export function conceptsOverlap(a, b) {
  const ka = conceptKey(a);
  const kb = conceptKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;

  const short = ka.length <= kb.length ? ka : kb;
  const long = ka.length <= kb.length ? kb : ka;
  if (short.length >= 12 && long.includes(short)) return true;

  const ta = ka.split(' ');
  const tb = kb.split(' ');
  const setB = new Set(tb);
  const shared = ta.filter(t => setB.has(t));
  const minLen = Math.min(ta.length, tb.length);
  return shared.length >= Math.max(2, Math.ceil(minLen * 0.6));
}

export function isAlreadyTaught(concept, taughtList) {
  if (!concept) return false;
  return (taughtList || []).some(t => conceptsOverlap(concept, t));
}

/** Drop steer options that repeat a concept already taught this story. */
export function filterUnusedDirections(dirs, taughtConcepts) {
  if (!Array.isArray(dirs)) return [];
  const seen = [];
  return dirs.filter((d) => {
    const concept = d?.concept || d?.label;
    if (isAlreadyTaught(concept, taughtConcepts)) return false;
    if (seen.some(s => conceptsOverlap(s, concept))) return false;
    seen.push(concept);
    return true;
  });
}
