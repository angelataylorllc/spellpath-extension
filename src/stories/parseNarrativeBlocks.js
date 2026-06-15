/**
 * Split narrative text into prose and dialogue blocks for display.
 * Handles partial text during typewriter reveal (unclosed trailing quote).
 *
 * @param {string} text
 * @returns {{ type: 'prose' | 'dialogue', text: string }[]}
 */
export function parseNarrativeBlocks(text) {
  if (!text) return [];

  const blocks = [];
  const regex = /"[^"]*"/g;
  let lastEnd = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastEnd) {
      appendProse(blocks, text.slice(lastEnd, match.index));
    }
    blocks.push({ type: 'dialogue', text: match[0] });
    lastEnd = match.index + match[0].length;
  }

  const tail = text.slice(lastEnd);
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

function appendProse(blocks, text) {
  if (text.trim()) blocks.push({ type: 'prose', text });
}
