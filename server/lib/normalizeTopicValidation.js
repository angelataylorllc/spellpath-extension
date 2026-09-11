import { AUTHOR_EXAMPLES } from '../../lib/genreVoice.js';

const VALID_STATUS = new Set(['accept', 'clarify', 'reject']);
const VALID_CATEGORY = new Set(['standard', 'heritage', 'niche', 'unknown']);
const VALID_AUTHOR_STATUS = new Set(['accept', 'warn', 'skip']);

function cleanString(value, maxLen = 400) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function cleanSuggestions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(s => cleanString(s, 120))
    .filter(Boolean)
    .slice(0, 4);
}

function normalizeAuthorStyleCheck(parsed, { authorStyle, genre } = {}) {
  const author = cleanString(authorStyle, 120);
  if (!author) return null;

  const raw = parsed?.authorStyleCheck;
  if (!raw || typeof raw !== 'object') {
    return { status: 'accept', reason: '', suggestedGenre: null };
  }

  let status = VALID_AUTHOR_STATUS.has(raw.status) ? raw.status : 'accept';
  let reason = cleanString(raw.reason, 300);
  const suggestedGenre = cleanString(raw.suggestedGenre, 40) || null;

  if (status === 'warn' && !reason) {
    const examples = AUTHOR_EXAMPLES[genre] || 'another author in this genre';
    reason = `"${author}" may read better in a different story style. Try ${examples}, or continue anyway.`;
  }

  if (status === 'warn' && suggestedGenre && suggestedGenre === genre) {
    status = 'accept';
    reason = '';
  }

  return {
    status,
    reason,
    suggestedGenre: status === 'warn' ? suggestedGenre : null,
  };
}

/**
 * Normalize LLM topic validation output. Defaults to clarify when uncertain.
 * @param {unknown} parsed
 * @param {{ subject?: string, learningGoals?: string, authorStyle?: string, genre?: string }} context
 */
export function normalizeTopicValidation(parsed, { subject, learningGoals, authorStyle, genre } = {}) {
  const goals = cleanString(learningGoals, 500);
  let status = VALID_STATUS.has(parsed?.status) ? parsed.status : 'clarify';
  let category = VALID_CATEGORY.has(parsed?.category) ? parsed.category : 'unknown';

  const normalizedSubject = cleanString(parsed?.normalizedSubject, 200) || cleanString(subject, 200);
  let reason = cleanString(parsed?.reason, 300);
  let suggestions = cleanSuggestions(parsed?.suggestions);

  if (goals.length >= 12 && status === 'clarify' && category !== 'unknown') {
    status = 'accept';
  }

  if (!reason) {
    if (status === 'reject') {
      reason =
        'SpellPath is for learning real topics. Try a skill, tool, or subject — like day trading, Excel, or Scottish clan history.';
    } else if (status === 'clarify') {
      reason = 'This looks learnable — can you narrow it a bit? What part do you want to explore?';
    }
  }

  if (status === 'accept' && category === 'heritage' && !goals.length) {
    status = 'clarify';
    reason =
      'Family and clan topics work best with a specific goal — e.g. documented clan history, or how to research your name.';
    if (suggestions.length === 0) {
      suggestions.push(
        'Clan history and Scottish heritage (general, documented facts)',
        'How to research our family name using public records',
      );
    }
  }

  const authorStyleCheck = normalizeAuthorStyleCheck(parsed, { authorStyle, genre });

  return {
    status,
    category,
    normalizedSubject,
    reason,
    suggestions,
    authorStyleCheck,
  };
}
