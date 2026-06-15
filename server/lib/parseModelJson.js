/**
 * Parse JSON from an OpenAI chat completion string.
 * Handles markdown fences, wrapped prose, and truncated completions.
 */

function tryParse(candidate) {
  if (!candidate) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

/** Close unclosed strings/brackets when the model hits max_tokens mid-JSON. */
function repairTruncatedJson(raw) {
  let repaired = raw.trim();
  let inString = false;
  let escaped = false;
  const stack = [];

  for (const char of repaired) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{' || char === '[') stack.push(char);
      else if (char === '}' || char === ']') stack.pop();
    }
  }

  if (inString) repaired += '"';

  // Drop a trailing comma before we close containers.
  repaired = repaired.replace(/,\s*$/, '');

  while (stack.length) {
    const open = stack.pop();
    repaired += open === '{' ? '}' : ']';
  }

  return repaired;
}

/**
 * @param {string | null | undefined} raw
 * @param {{ route?: string, finishReason?: string | null }} [meta]
 */
export function parseModelJson(raw, { route, finishReason } = {}) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('No content returned from model');
  }

  const trimmed = raw.trim();
  const candidates = new Set([trimmed]);

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.add(fenced[1].trim());

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.add(trimmed.slice(firstBrace, lastBrace + 1));
  }

  if (finishReason === 'length') {
    candidates.add(repairTruncatedJson(trimmed));
    if (firstBrace !== -1) {
      candidates.add(repairTruncatedJson(trimmed.slice(firstBrace)));
    }
  }

  for (const candidate of candidates) {
    const parsed = tryParse(candidate);
    if (parsed !== null) return parsed;
  }

  console.error(
    `[spellpath] Failed to parse model JSON (${route || 'unknown'}, finish=${finishReason || 'unknown'}):`,
    trimmed.slice(0, 500),
    trimmed.length > 500 ? `… [${trimmed.length} chars total]` : '',
  );
  throw new Error('Failed to parse model response');
}
