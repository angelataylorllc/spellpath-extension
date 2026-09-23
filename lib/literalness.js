/**
 * How literal the prose must be about the real mechanism.
 *
 * Invisible mechanisms (digestion, chemistry, economics) push the writer toward
 * allegory, and allegory teaches its own vocabulary instead of the subject. This
 * rail decides how much of the real thing has to survive the metaphor.
 *
 * learningFocus wins over motivation: asking "what's going on and why" means the
 * learner wants the logic, whatever they clicked for a reason.
 */

export const LITERALNESS_VALUES = ['anchored', 'explicit'];

const LEVELS = {
  /** Metaphor carries the scene, but the real words still appear. */
  anchored: {
    level: 'anchored',
    realTermsMin: 2,
    allegory: 'A story-world stand-in may carry the scene (glowing walls for an acid response).',
    naming: 'Name the real thing at least twice in narration. A parenthetical beside the story word is ideal: "the chambers below (her stomach, a physician would have said)". Never finish a beat where the real subject is never named.',
    checkpoint: 'The correct option may use the story words, but it must also contain the real term so the learner can tell what was actually taught.',
    rule: 'Metaphor-forward, still anchored. The reader should be able to say what real thing the story was about.',
  },
  /** The learner asked how it works; the mechanism is the scene. */
  explicit: {
    level: 'explicit',
    realTermsMin: 4,
    allegory: 'No allegorical substitute for the mechanism. Genre supplies the SITUATION (a workshop, a ship, a night market), not a metaphor that replaces the subject.',
    naming: 'Use the real terms throughout, in narration and dialogue. Define a hard term in scene the first time, then keep using it.',
    checkpoint: 'The question and the correct option must be in real terms, not story words. Do not test the metaphor.',
    rule: 'Explicit and logical. Cause and effect named plainly, with the real vocabulary. Charm comes from voice, not from renaming the subject.',
  },
};

const FOCUS_EXPLICIT = new Set(['understanding', 'method', 'use']);
const MOTIVATION_EXPLICIT = new Set(['school', 'building']);

/**
 * @param {{ learningFocus?: string, motivation?: string }} input
 */
export function getLiteralness({ learningFocus, motivation } = {}) {
  const focus = String(learningFocus || '').trim().toLowerCase();
  const why = String(motivation || '').trim().toLowerCase();

  if (FOCUS_EXPLICIT.has(focus)) return LEVELS.explicit;
  if (MOTIVATION_EXPLICIT.has(why)) return LEVELS.explicit;
  return LEVELS.anchored;
}
