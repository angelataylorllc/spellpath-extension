import { normalizeQuotes } from '../../lib/normalizeQuotes.js';
import {
  conceptsOverlap,
  filterUnusedDirections,
  isAlreadyTaught,
} from '../../lib/steerDirections.js';

function pickLabel(option) {
  if (option == null) return '';
  if (typeof option === 'string') return option.trim();
  if (typeof option !== 'object') return '';

  const label =
    option.label ??
    option.text ??
    option.option ??
    option.value ??
    option.content ??
    option.answer ??
    option.choice ??
    option.title;

  return typeof label === 'string' ? label.trim() : '';
}

function resolveCorrectIndex(checkpoint, options) {
  if (Number.isInteger(checkpoint?.correctIndex)) return checkpoint.correctIndex;
  if (Number.isInteger(checkpoint?.answer)) return checkpoint.answer;
  if (Number.isInteger(checkpoint?.correctAnswer)) return checkpoint.correctAnswer;

  const idx = options.findIndex(opt => opt && typeof opt === 'object' && opt.correct === true);
  return idx >= 0 ? idx : -1;
}

function coerceOptionsArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') return Object.values(raw);
  return [];
}

function normalizeOptions(checkpoint) {
  const raw = coerceOptionsArray(checkpoint?.options);
  const correctIndex = resolveCorrectIndex(checkpoint, raw);

  let chosen = raw;
  if (raw.length > 3) {
    if (correctIndex >= 0 && correctIndex < raw.length) {
      const correct = raw[correctIndex];
      const rest = raw.filter((_, i) => i !== correctIndex);
      chosen = [correct, ...rest].slice(0, 3);
    } else {
      chosen = raw.slice(0, 3);
    }
  }

  const options = chosen.map((opt, index) => {
    const label = pickLabel(opt) || `Option ${index + 1}`;
    const inferredCorrect = raw.length > 3 && correctIndex >= 0
      ? index === 0
      : index === correctIndex;
    const correct =
      opt && typeof opt === 'object' && 'correct' in opt
        ? Boolean(opt.correct)
        : inferredCorrect;

    return { label, correct };
  });

  if (options.length > 0 && !options.some(o => o.correct)) {
    const fallback = raw.length > 3 && correctIndex >= 0 ? 0 : correctIndex;
    if (fallback >= 0 && fallback < options.length) {
      options.forEach((o, i) => {
        o.correct = i === fallback;
      });
    }
  }

  return options;
}

/** Fisher–Yates shuffle so the correct option is not always first in the UI. */
function shuffleOptions(options) {
  if (!Array.isArray(options) || options.length < 2) return options;

  const shuffled = [...options];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function normalizeCheckpoint(checkpoint) {
  if (!checkpoint || typeof checkpoint !== 'object') return checkpoint;
  const options = shuffleOptions(normalizeOptions(checkpoint));

  return {
    ...checkpoint,
    options,
  };
}

/** True when checkpoint options look like failed/partial model output. */
export function checkpointOptionsValid(checkpoint) {
  const options = checkpoint?.options;
  if (!Array.isArray(options) || options.length < 2) return false;
  const realLabels = options.filter(
    o => o?.label && o.label.trim() && !/^Option \d+$/.test(o.label.trim()),
  );
  return realLabels.length >= 2;
}

function unusedPoolItems(optionalPool, taught, alreadyPicked) {
  const pool = Array.isArray(optionalPool) ? optionalPool : [];
  const seen = [...alreadyPicked];
  const unused = [];
  for (const item of pool) {
    const text = String(item || '').trim();
    if (!text) continue;
    if (isAlreadyTaught(text, taught)) continue;
    if (seen.some(s => conceptsOverlap(s, text))) continue;
    seen.push(text);
    unused.push(text);
  }
  return unused;
}

function normalizeNextDirections(raw, ctx = {}) {
  const {
    isLastBeat,
    isRemedial,
    cast,
    optionalPool,
    alreadyTaught = [],
    currentConcept = '',
  } = ctx;
  if (isLastBeat || isRemedial) return [];

  const taught = [...alreadyTaught, currentConcept].filter(Boolean);

  const list = Array.isArray(raw) ? raw : [];
  const cleaned = filterUnusedDirections(
    list
      .filter(d => d && typeof d === 'object')
      .map((d, i) => {
        const label = String(d.label || d.topic || d.text || '').trim().slice(0, 72);
        const concept = String(d.concept || d.teaches || label).trim().slice(0, 160);
        if (!label || !concept) return null;
        return {
          id: String(d.id || `dir_${i + 1}`).slice(0, 32),
          label,
          concept,
          speaker: String(d.speaker || d.name || '').trim().slice(0, 40),
          isMainThread: Boolean(d.isMainThread || d.mainThread),
        };
      })
      .filter(Boolean),
    taught,
  ).slice(0, 3);

  if (cleaned.length >= 2) {
    if (!cleaned.some(d => d.isMainThread)) cleaned[0].isMainThread = true;
    return cleaned;
  }

  const extras = unusedPoolItems(
    optionalPool,
    taught,
    cleaned.map(d => d.concept),
  );
  if (cleaned.length + extras.length < 2) {
    return cleaned;
  }

  const companions = Array.isArray(cast) ? cast : [];
  const people = companions.length
    ? companions
    : [{ name: '' }, { name: '' }, { name: '' }];
  const padded = [...cleaned];
  extras.forEach((item) => {
    if (padded.length >= 3) return;
    const person = people[padded.length] || {};
    padded.push({
      id: `dir_${padded.length + 1}`,
      label: item.slice(0, 72),
      concept: item.slice(0, 160),
      speaker: person.name || '',
      isMainThread: false,
    });
  });
  if (!padded.some(d => d.isMainThread)) padded[0].isMainThread = true;
  return padded.slice(0, 3);
}

/** Normalize quote characters and checkpoint shape before sending to the client. */
export function normalizeBeatResponse(beat, ctx = {}) {
  if (!beat || typeof beat !== 'object') return beat;

  const normalized = { ...beat };
  if (typeof normalized.narrative === 'string') {
    normalized.narrative = normalizeQuotes(normalized.narrative);
  }
  if (normalized.checkpoint) {
    normalized.checkpoint = normalizeCheckpoint(normalized.checkpoint);
  }
  if (typeof normalized.unresolvedHook === 'string') {
    normalized.unresolvedHook = normalized.unresolvedHook.trim().slice(0, 240);
  } else {
    normalized.unresolvedHook = '';
  }
  normalized.nextDirections = normalizeNextDirections(normalized.nextDirections, ctx);
  if (typeof normalized.recapTitle === 'string') {
    normalized.recapTitle = normalized.recapTitle.trim().slice(0, 48);
  }
  return normalized;
}
