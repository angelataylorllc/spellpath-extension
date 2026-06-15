import { normalizeQuotes } from '../../lib/normalizeQuotes.js';

function optionLabel(option) {
  if (!option || typeof option !== 'object') return 'Option';
  const label = option.label ?? option.text ?? option.option ?? option.value;
  return typeof label === 'string' && label.trim() ? label.trim() : 'Option';
}

function normalizeCheckpoint(checkpoint) {
  if (!checkpoint || typeof checkpoint !== 'object') return checkpoint;
  const options = Array.isArray(checkpoint.options) ? checkpoint.options : [];
  return {
    ...checkpoint,
    options: options.map(opt => ({
      label: optionLabel(opt),
      correct: Boolean(opt?.correct),
    })),
  };
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
