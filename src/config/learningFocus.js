export const LEARNING_FOCUS_OPTIONS = [
  { label: 'Getting started / basics', value: 'getting_started' },
  { label: 'How it works (core concepts)', value: 'concepts' },
  { label: 'Practical use & integrations', value: 'practical' },
  { label: 'Applying it (projects, marketing, etc.)', value: 'applying' },
  { label: 'Troubleshooting / going deeper', value: 'advanced_use' },
];

export const LEARNING_FOCUS_LABELS = Object.fromEntries(
  LEARNING_FOCUS_OPTIONS.map(o => [o.value, o.label]),
);
