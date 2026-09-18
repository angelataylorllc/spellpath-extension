import { normalizeQuotes } from '../../lib/normalizeQuotes.js';

const SPEECH_TAG =
  /^(?:[A-Z][\w'-]+|she|he|they|you)\s+(?:said|asked|replied|continued|muttered|confirmed|added|whispered|called|answered|noted|offered|went on)\b(?:(?!\s+(?:and|but|then)\b)\s+[^\s"]+){0,6}/i;

/**
 * After a closing quote, pull a short "Vex said" / "she said without looking up" tag
 * so punched-out dialogue keeps its attribution instead of orphaning "she said."
 * @param {string} after
 * @returns {string}
 */
function takeSpeechTag(after) {
  if (!after) return '';
  const leading = after.match(/^\s*/)?.[0] || '';
  const rest = after.slice(leading.length);
  const match = rest.match(SPEECH_TAG);
  if (!match) return '';

  let tag = match[0];
  const remainder = rest.slice(tag.length);
  if (/^[.]/.test(remainder)) {
    tag += '.';
  } else if (/^,/.test(remainder)) {
    tag += ',';
  }

  return `${leading}${tag}`;
}

function appendProse(blocks, text) {
  if (text.trim()) blocks.push({ type: 'prose', text });
}

/**
 * Split narrative text into prose and dialogue blocks for display.
 * Author-voice prose stays intact first; layout then punches out each spoken turn
 * (quote + short speech tag). Handles partial text during typewriter reveal.
 *
 * @param {string} text
 * @returns {{ type: 'prose' | 'dialogue', text: string }[]}
 */
export function parseNarrativeBlocks(text) {
  if (!text) return [];

  const normalized = normalizeQuotes(text);
  const blocks = [];
  const regex = /"[^"]*"/g;
  let lastEnd = 0;
  let match;

  while ((match = regex.exec(normalized)) !== null) {
    if (match.index > lastEnd) {
      appendProse(blocks, normalized.slice(lastEnd, match.index));
    }

    const afterQuote = normalized.slice(match.index + match[0].length);
    const tag = takeSpeechTag(afterQuote);
    blocks.push({ type: 'dialogue', text: `${match[0]}${tag}` });
    lastEnd = match.index + match[0].length + tag.length;
    regex.lastIndex = lastEnd;
  }

  const tail = normalized.slice(lastEnd);
  if (!tail) return blocks;

  const openQuote = tail.indexOf('"');
  if (openQuote !== -1) {
    appendProse(blocks, tail.slice(0, openQuote));
    blocks.push({ type: 'dialogue', text: tail.slice(openQuote) });
  } else {
    appendProse(blocks, tail);
  }

  return blocks;
}

function isIsolatedQuote(paragraph) {
  return /^"[^"]{1,400}"[,.!?]?$/.test(String(paragraph || '').trim());
}

/**
 * Models often put `"Hello,"` and `Vex said.` in separate paragraphs.
 * Join those before layout punch-out so a spoken turn stays one unit.
 * @param {string} text
 * @returns {string[]}
 */
export function coalesceNarrativeParagraphs(text) {
  const paragraphs = String(text || '')
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean);

  const merged = [];
  for (let i = 0; i < paragraphs.length; i += 1) {
    const current = paragraphs[i];
    const next = paragraphs[i + 1];
    if (isIsolatedQuote(current) && next && !isIsolatedQuote(next)) {
      merged.push(`${current} ${next}`);
      i += 1;
      continue;
    }
    if (isIsolatedQuote(current) && merged.length > 0) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${current}`;
      continue;
    }
    merged.push(current);
  }
  return merged;
}
