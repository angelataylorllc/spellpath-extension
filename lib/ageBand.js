/** Age bands that change story length and reading register. */

export const AGE_VALUES = ['6_10', '11_13', '13_17', '18_64', '65_plus'];

export const AGE_QUIZ_CHOICES = [
  { label: '6–10 (shortest, simplest story)', value: '6_10' },
  { label: '11–13 (simpler words, shorter scenes)', value: '11_13' },
  { label: '13–17 (clear teen-level story)', value: '13_17' },
  { label: '18–64 (standard adult story)', value: '18_64' },
  { label: '65+ (unhurried, everyday words)', value: '65_plus' },
];

const ALIASES = {
  under_13: '11_13',
  '13_17': '13_17',
  '18_24': '18_64',
  '25_44': '18_64',
  '45_64': '18_64',
};

const BUDGETS = {
  '6_10': {
    minWords: 80,
    maxWords: 150,
    paragraphs: '2-3',
    spokenLines: '2-3',
    maxTokens: 1100,
    skeletonMaxTokens: 700,
    restyleMaxTokens: 1100,
    register: 'children\'s book',
    phraseShape: 'Short clear clauses, often joined with and. Concrete verbs (hopped, skipped, winked, gasped). Dialogue that sounds spoken.',
    metaphorDensity: 'Pictures you can draw. Specific names are fine (Kea, budgerigar). No adult compression or lyric asides.',
    okLine: 'The page was wet. Kia saw a drawing of a puddle.',
    badLine: 'Dr. Iris\'s handwriting swims before you; the puddle sits patient and small.',
    choiceLabel: 'Button a child would tap, using the spoken words. "So they can grow far away" not "Seed Dispersal".',
    rule: 'Children\'s-book phrasing, not a baby word-list. Hard nouns OK if the scene holds them. A 250-word literary beat is WRONG.',
  },
  '11_13': {
    minWords: 150,
    maxWords: 250,
    paragraphs: '3-4',
    spokenLines: '3-4',
    maxTokens: 1500,
    skeletonMaxTokens: 700,
    restyleMaxTokens: 1500,
    register: 'middle-grade',
    phraseShape: 'Mostly short-to-medium sentences. One school word is fine if the scene shows it.',
    metaphorDensity: 'One clear picture at a time. Skip stacked asides.',
    okLine: 'Kai crouched by the puddle. By lunch it would be gone, and nobody had brought a broom.',
    badLine: 'Something about that vanished water nags at you, as if the answer were written in the air itself.',
    choiceLabel: 'Plain button, not a textbook heading.',
    rule: 'Simpler phrases and shorter scenes. Show one mechanism. Not literary adult.',
  },
  '13_17': {
    minWords: 200,
    maxWords: 300,
    paragraphs: '4',
    spokenLines: '4-5',
    maxTokens: 1900,
    skeletonMaxTokens: 700,
    restyleMaxTokens: 1900,
    register: 'teen',
    phraseShape: 'Clear teen sentences. Light irony is fine. Skip dense adult asides.',
    metaphorDensity: 'A few images, not a lyric stack.',
    okLine: 'The chalk circle was empty by noon. No rain. Nobody had swept.',
    badLine: 'The meadow is quiet now, but something about that vanished water nags at you.',
    choiceLabel: 'Clear teen button. Not a unit title.',
    rule: 'Clear teen-level story. Not too dense.',
  },
  '18_64': {
    minWords: 250,
    maxWords: 400,
    paragraphs: '4-5',
    spokenLines: '5+',
    maxTokens: 2200,
    skeletonMaxTokens: 800,
    restyleMaxTokens: 2200,
    register: 'adult',
    phraseShape: 'Standard adult sentences. Author devices allowed in the restyle pass.',
    metaphorDensity: 'Adult fiction is fine; still show the mechanism.',
    okLine: 'A puddle she had chalked at dawn was gone by noon — no rain, no broom.',
    badLine: 'In this section we will explain evaporation.',
    choiceLabel: 'Short adult button. Can name the idea.',
    rule: 'Standard adult story.',
  },
  '65_plus': {
    minWords: 250,
    maxWords: 400,
    paragraphs: '4-5',
    spokenLines: '5+',
    maxTokens: 2200,
    skeletonMaxTokens: 800,
    restyleMaxTokens: 2200,
    register: 'adult, unhurried',
    phraseShape: 'Adult sentences, slightly unhurried. Define a hard term in scene the first time.',
    metaphorDensity: 'Same as adult. Not simpler ideas — plainer jargon.',
    okLine: 'The water did not vanish. It rose into the air as vapor — water you cannot see.',
    badLine: 'Write down to the reader; skip the mechanism.',
    choiceLabel: 'Short adult button. Plain words, not denser jargon than the scene.',
    rule: 'Same depth as adult; unhurried; define jargon once. Not a children\'s register.',
  },
};

export function normalizeAge(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (ALIASES[value]) return ALIASES[value];
  if (AGE_VALUES.includes(value)) return value;
  return '18_64';
}

export function getAgeBudget(raw) {
  const age = normalizeAge(raw);
  return { age, ...BUDGETS[age] };
}
