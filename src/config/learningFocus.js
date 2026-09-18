export const LEARNING_FOCUS_OPTIONS = [
  { label: "What's going on (the why)", value: 'understanding' },
  { label: 'How to work with it (the process)', value: 'method' },
  { label: 'Help me use it (a purpose)', value: 'use' },
];

export const LEARNING_FOCUS_LABELS = Object.fromEntries(
  LEARNING_FOCUS_OPTIONS.map(o => [o.value, o.label]),
);
