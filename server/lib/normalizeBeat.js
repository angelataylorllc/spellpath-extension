import { normalizeQuotes } from '../../lib/normalizeQuotes.js';

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

  const options = raw.slice(0, 5).map((opt, index) => {
    const label = pickLabel(opt) || `Option ${index + 1}`;
    const correct =
      opt && typeof opt === 'object' && 'correct' in opt
        ? Boolean(opt.correct)
        : index === correctIndex;

    return { label, correct };
  });

  if (options.length > 0 && !options.some(o => o.correct) && correctIndex >= 0 && correctIndex < options.length) {
    options.forEach((o, i) => {
      o.correct = i === correctIndex;
    });
  }

  return options;
}

function normalizeCheckpoint(checkpoint) {
  if (!checkpoint || typeof checkpoint !== 'object') return checkpoint;
  const options = normalizeOptions(checkpoint);

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

/** Normalize quote characters and checkpoint shape before sending to the client. */
export function normalizeBeatResponse(beat) {
  if (!beat || typeof beat !== 'object') return beat;

  const normalized = { ...beat };
  if (typeof normalized.narrative === 'string') {
    normalized.narrative = normalizeQuotes(normalized.narrative);
  }
  if (normalized.checkpoint) {
    normalized.checkpoint = normalizeCheckpoint(normalized.checkpoint);
  }
  return normalized;
}
