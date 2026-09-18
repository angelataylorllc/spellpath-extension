/** Learner facet — what kind of thing to teach. Distinct from motivation (the ending). */

export const LEARNING_FOCUS_VALUES = ['understanding', 'method', 'use', 'general'];

/** Same bar as topic-gate "goals are specific enough." Below this, the focus dropdown is the fallback. */
export const LEARNING_GOALS_SPECIFIC_MIN = 12;

const ALIASES = {
  getting_started: 'understanding',
  concepts: 'understanding',
  concept: 'understanding',
  practical: 'method',
  applying: 'use',
  advanced_use: 'use',
};

export function learningGoalsAreSpecific(raw) {
  return String(raw || '').trim().length >= LEARNING_GOALS_SPECIFIC_MIN;
}

export function normalizeLearningFocus(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) return 'general';
  if (ALIASES[value]) return ALIASES[value];
  if (LEARNING_FOCUS_VALUES.includes(value)) return value;
  return 'general';
}

/** Goals text wins; dropdown only when the box is empty or too thin. */
export function resolveLearningFocus(goals, focus) {
  if (learningGoalsAreSpecific(goals)) return 'general';
  return normalizeLearningFocus(focus);
}
