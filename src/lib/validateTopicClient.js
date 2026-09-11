/** Instant client-side checks before calling the topic validator API. */

const REJECT_MESSAGE =
  'SpellPath is for learning real topics. Try something like day trading, Clan Munro history, or Excel.';

export function validateTopicClient(subject) {
  const trimmed = String(subject || '').trim();

  if (trimmed.length < 2) {
    return { ok: false, reason: REJECT_MESSAGE };
  }

  if (trimmed.length > 200) {
    return { ok: false, reason: 'Please keep your topic under 200 characters.' };
  }

  const letters = trimmed.replace(/[^a-zA-Z\u00C0-\u024F]/g, '');
  if (letters.length < 2) {
    return { ok: false, reason: REJECT_MESSAGE };
  }

  const compact = trimmed.replace(/\s/g, '');
  if (/^(.)\1{4,}$/i.test(compact)) {
    return { ok: false, reason: REJECT_MESSAGE };
  }

  if (/^[^a-zA-Z0-9\u00C0-\u024F]+$/.test(trimmed)) {
    return { ok: false, reason: REJECT_MESSAGE };
  }

  const vowels = (trimmed.match(/[aeiouAEIOU\u00C0-\u024F]/g) || []).length;
  if (compact.length >= 6 && vowels === 0) {
    return { ok: false, reason: REJECT_MESSAGE };
  }

  return { ok: true };
}

export const TOPIC_REJECT_MESSAGE = REJECT_MESSAGE;

export const HERITAGE_ACCEPT_NOTE =
  "We'll explore documented history and how to research your heritage. SpellPath won't know your specific family line unless you tell us — and some details may be AI guesses, not verified facts.";

export const NICHE_ACCEPT_NOTE =
  'This topic may be niche — treat historical or factual claims as starting points and verify important details independently.';
