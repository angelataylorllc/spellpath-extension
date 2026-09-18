import {
  findAuthorCard,
  formatCuratedAuthorGuide,
  formatExpandedAuthorGuide,
  formatGenericAuthorGuide,
  normalizeAuthorKey,
} from '../../lib/authorVoiceCards.js';
import { getCachedAuthorVoice, writeCachedAuthorVoice } from './authorVoiceCache.js';
import { callLLM } from './llm/callLLM.js';

const EXPAND_SYSTEM = `
You extract reusable PROSE STYLE TRAITS for one author, for an original educational story.

Return JSON only:
{
  "canonicalName": "string",
  "traits": ["5 to 8 craft traits"],
  "worldCaution": false
}

Rules:
- Traits describe HOW they write: rhythm, diction, POV habits, sensory habits, humor, sentence shape, dialogue.
- No book titles, no character names, no place names from their works, no plot summaries, no quotations.
- worldCaution is true if the author is strongly tied to a famous secondary world or franchise detective/setting that must never be used.
- If the name is obscure or not a prose-fiction author, still give 5 cautious literary traits that match the common association, or general literary craft — never invent plots.`.trim();

function normalizeTraits(parsed) {
  const raw = Array.isArray(parsed?.traits) ? parsed.traits : [];
  return raw
    .map((t) => String(t || '').replace(/\s+/g, ' ').trim())
    .filter((t) => t.length >= 12 && t.length <= 240)
    .slice(0, 8);
}

function voiceResult(source, name, guide, compactGuide) {
  return {
    source,
    name,
    guide,
    compactGuide: compactGuide || guide,
  };
}

/**
 * Card or server cache only — never calls the LLM. Safe on the beat path.
 * @param {string} authorStyle
 */
export function lookupAuthorVoiceGuide(authorStyle) {
  const name = String(authorStyle || '').trim();
  if (!name) return voiceResult('none', '', '');

  const card = findAuthorCard(name);
  if (card) {
    return voiceResult(
      'curated',
      card.name,
      formatCuratedAuthorGuide(card),
      formatCuratedAuthorGuide(card, { compact: true }),
    );
  }

  const cached = getCachedAuthorVoice(normalizeAuthorKey(name));
  if (cached?.traits?.length >= 4) {
    const canonical = String(cached.canonicalName || name).trim();
    const guide = formatExpandedAuthorGuide(canonical, cached);
    return voiceResult('cache', canonical, guide);
  }

  return voiceResult('generic', name, formatGenericAuthorGuide(name));
}

/**
 * Resolve once at scaffold time. Unknown names get one expand call, then cache.
 * @param {import('express').Request} req
 * @param {{ authorStyle?: string, genre?: string }} opts
 */
export async function resolveAuthorVoiceGuide(req, { authorStyle, genre } = {}) {
  const name = String(authorStyle || '').trim();
  if (!name) return voiceResult('none', '', '');

  const existing = lookupAuthorVoiceGuide(name);
  if (existing.source === 'curated' || existing.source === 'cache') return existing;

  try {
    const parsed = await callLLM(req, 'author-voice', {
      systemPrompt: EXPAND_SYSTEM,
      userPayload: { author: name, genre: genre || '' },
      maxTokens: 500,
      temperature: 0.3,
    });
    const traits = normalizeTraits(parsed);
    if (traits.length >= 5) {
      const canonical = String(parsed?.canonicalName || name).trim().slice(0, 80) || name;
      const entry = {
        canonicalName: canonical,
        traits,
        worldCaution: Boolean(parsed?.worldCaution),
        genre: genre || '',
        source: 'expanded',
        trusted: false,
      };
      writeCachedAuthorVoice(normalizeAuthorKey(name), entry);
      const guide = formatExpandedAuthorGuide(canonical, entry);
      return voiceResult('expanded', canonical, guide);
    }
  } catch (err) {
    console.warn('[spellpath] author voice expand failed:', err?.message || err);
  }

  return voiceResult('generic', name, formatGenericAuthorGuide(name));
}
