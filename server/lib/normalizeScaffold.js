import { normalizeMotivation } from '../../lib/motivation.js';
import { normalizeLearningFocus } from '../../lib/learningFocus.js';

/**
 * Ensure spine fields exist and stay small: 2–3 companions, short through-line.
 */

function asStringList(value, maxItems, maxLen) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => (typeof item === 'string' ? item : item?.label || item?.concept || ''))
    .map(s => String(s).trim())
    .filter(Boolean)
    .map(s => s.slice(0, maxLen))
    .slice(0, maxItems);
}

/** One recorded choice per companion so every beat uses the same pronoun. */
function normalizePronouns(raw, index) {
  const text = String(raw || '').trim().toLowerCase();
  if (/\b(he|him|his)\b/.test(text)) return 'he';
  if (/\b(she|her|hers)\b/.test(text)) return 'she';
  if (/\b(they|them|their)\b/.test(text)) return 'they';
  return index % 2 === 0 ? 'she' : 'he';
}

function normalizeCastMember(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name || raw.Name || '').trim().slice(0, 40);
  if (!name) return null;

  const aspectsRaw = Array.isArray(raw.aspects)
    ? raw.aspects
    : [raw.aspect, raw.focus].filter(Boolean);

  return {
    id: String(raw.id || `cast_${index + 1}`).slice(0, 32),
    name,
    role: String(raw.role || 'companion').trim().slice(0, 48),
    pronouns: normalizePronouns(raw.pronouns || raw.pronoun || raw.gender, index),
    aspects: asStringList(aspectsRaw, 3, 80),
    voice: String(raw.voice || raw.speech || '').trim().slice(0, 160),
  };
}

export function normalizeScaffold(parsed, { motivation, learningFocus } = {}) {
  if (!parsed || typeof parsed !== 'object') return parsed;

  const scaffold = { ...parsed };
  scaffold.motivation = normalizeMotivation(scaffold.motivation || motivation);
  scaffold.learningFocus = normalizeLearningFocus(scaffold.learningFocus || learningFocus);
  scaffold.throughLine = String(scaffold.throughLine || scaffold.through_line || '')
    .trim()
    .slice(0, 280);

  const rawCast = Array.isArray(scaffold.cast) ? scaffold.cast : [];
  scaffold.cast = rawCast
    .map((member, i) => normalizeCastMember(member, i))
    .filter(Boolean)
    .slice(0, 3);

  scaffold.mustCover = asStringList(scaffold.mustCover || scaffold.must_cover, 4, 120);
  scaffold.optionalPool = asStringList(
    scaffold.optionalPool || scaffold.optional_pool,
    8,
    120,
  );

  return scaffold;
}
