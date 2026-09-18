/** Learner "why" — shapes the scaffold ending, not the subject. */

export const MOTIVATION_VALUES = ['curious', 'school', 'building'];

const ALIASES = {
  work: 'building',
  project: 'building',
  passion: 'curious',
};

export function normalizeMotivation(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (ALIASES[value]) return ALIASES[value];
  if (MOTIVATION_VALUES.includes(value)) return value;
  return 'curious';
}
