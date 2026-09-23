/** Small, cheap checks for beat skeleton + write. Prefer retry over longer prompts. */

const STOP = new Set([
  'that', 'this', 'with', 'from', 'they', 'them', 'then', 'when', 'what',
  'your', 'their', 'have', 'been', 'were', 'will', 'into', 'only', 'just',
  'than', 'also', 'over', 'after', 'before', 'about', 'does', 'dont',
  'not', 'the', 'and', 'for', 'are', 'but', 'was', 'can', 'she', 'his',
  'her', 'you', 'had',
]);

const POLARITY_PAIRS = [
  ['higher', 'lower'],
  ['highest', 'lowest'],
  ['rising', 'falling'],
  ['above', 'below'],
  ['toward', 'away'],
  ['taut', 'slack'],
  ['stuck', 'loose'],
  ['jumps', 'stays'],
  ['jumps', 'stayed'],
  ['jumped', 'stayed'],
  ['jump', 'stay'],
];

const PRIOR_VERB = 'drawn|built|tied|carved|written|placed';

const LIMB_NOUN = 'feet|legs|limbs|wheels|treads|arms|hands';

const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };

/** "two feet away", "three feet of cable" — a measurement, not a body part. */
const MEASURE_TAIL = /^\s+(of|away|apart|tall|long|wide|deep|high|from|above|below|behind|back|over|under|down|up|off|per|in|into|across)\b/i;

const BODY_PLANS = [
  { re: /\bbiped(s|al)?\b/i, feet: 2, name: 'biped' },
  { re: /\btripod(s|al)?\b/i, feet: 3, name: 'tripod' },
  { re: /\bquadruped(s|al)?\b/i, feet: 4, name: 'quadruped' },
  { re: /\bhexapod(s|al)?\b/i, feet: 6, name: 'hexapod' },
];

function contentWords(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
}

function hasWord(word, text) {
  return new RegExp(`\\b${word}\\b`, 'i').test(String(text || ''));
}

function spokenBody(text) {
  return String(text || '').replace(/^[^:]{1,40}:\s*/, '').trim();
}

export function looksLikeDefinition(text) {
  const s = String(text || '').trim();
  if (!s) return true;
  if (/\b(is when|means that|refers to|defined as)\b/i.test(s)) return true;
  if (/\bthe (idea|concept|lesson|fact) (is|that|of)\b/i.test(s)) return true;
  if (/^\s*(why|how|what)\b.{0,40}\b(is|are|works|means)\b/i.test(s)) return true;
  return false;
}

export function looksLikeLectureLine(text) {
  const line = spokenBody(text);
  if (!line) return false;
  if (line.split(/\s+/).filter(Boolean).length > 10) return true;
  return looksLikeThemeSpeech(line);
}

/** Theme-speech in a spoken line (no length cap — adult dialogue can be long). */
export function looksLikeThemeSpeech(text) {
  const line = spokenBody(String(text || '').replace(/^["']|["']$/g, ''));
  if (!line) return false;
  if (/\b(because|that's why|that is why|means that|the lesson|works even)\b/i.test(line)) return true;
  if (/\bthat's the (contract|problem|point|idea)\b/i.test(line)) return true;
  if (/\b(you understand then|understood then)\b/i.test(line)) return true;
  if (/^(the|that|this)\s+\w+\s+(is|are|means|holds)\b/i.test(line) && line.split(/\s+/).filter(Boolean).length > 8) {
    return true;
  }
  return false;
}

export function lectureLinesInNarrative(narrative) {
  const quotes = String(narrative || '').match(/"[^"]+"/g) || [];
  return quotes.map((q) => q.slice(1, -1)).filter(looksLikeThemeSpeech);
}

export function understandingCloser(narrative) {
  return /\b(understood then|as (he|she|they) understood)\b/i.test(String(narrative || ''));
}

export function skeletonPlanWeak(skeleton) {
  if (!skeleton || typeof skeleton !== 'object') return true;
  if (looksLikeDefinition(skeleton.shownBeat)) return true;
  const spoken = Array.isArray(skeleton.spokenPlan) ? skeleton.spokenPlan : [];
  return spoken.some(looksLikeLectureLine);
}

/** True when `text` only has the opposite pole of a one-sided `claim`. */
export function claimVsTextFlip(claim, text) {
  const c = String(claim || '');
  const t = String(text || '');
  if (!c || !t) return false;
  for (const [a, b] of POLARITY_PAIRS) {
    const cA = hasWord(a, c);
    const cB = hasWord(b, c);
    const tA = hasWord(a, t);
    const tB = hasWord(b, t);
    if (cA && !cB && tB && !tA) return true;
    if (cB && !cA && tA && !tB) return true;
  }
  return false;
}

function skeletonClaims(skeleton) {
  if (!skeleton || typeof skeleton !== 'object') return '';
  return [
    skeleton.shownBeat,
    skeleton.closeOn,
    skeleton.checkpointPlan?.correct,
    ...(Array.isArray(skeleton.mustShow) ? skeleton.mustShow : []),
  ].filter(Boolean).join(' ');
}

export function writeFlipsPolarity(skeleton, narrative) {
  return claimVsTextFlip(skeletonClaims(skeleton), narrative);
}

export function quizAgreesWithScene(checkpoint, narrative) {
  const correct = (checkpoint?.options || []).find((o) => o && o.correct);
  if (!correct?.label) return false;
  const words = contentWords(correct.label);
  if (!words.length) return true;
  const nar = String(narrative || '').toLowerCase();
  const hits = words.filter((w) => nar.includes(w));
  return hits.length >= Math.min(2, words.length);
}

export function quizFlipsSkeleton(checkpoint, skeleton) {
  const correct = (checkpoint?.options || []).find((o) => o && o.correct)?.label || '';
  return claimVsTextFlip(skeletonClaims(skeleton), correct);
}

const PRONOUN_KEYS = ['he', 'she', 'they'];

const GENDERED_PRONOUN = {
  he: /\b(he|him|his)\b/i,
  she: /\b(she|her|hers)\b/i,
};

/** "Vorn crouched and she checked the readout" — same subject, so no other referent. */
const COORDINATED = '(?:and|then|but|so|while)\\s+(he|she)\\b';

function escapeForRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function castWithPronouns(cast) {
  return (Array.isArray(cast) ? cast : [])
    .map((c) => ({
      name: String(c?.name || '').trim(),
      pronouns: String(c?.pronouns || '').trim().toLowerCase(),
    }))
    .filter((c) => c.name && PRONOUN_KEYS.includes(c.pronouns));
}

/**
 * A name rendered with a pronoun the cast never gave it. Quoted speech is
 * stripped first (characters discuss absent people), and a pronoun another
 * companion legitimately owns is left alone unless the clause shares a subject.
 * Silent when the scaffold predates cast pronouns.
 */
export function pronounDriftReason(narrative, cast) {
  const people = castWithPronouns(cast);
  if (!people.length) return '';

  const prose = String(narrative || '').replace(/"[^"]*"/g, ' ');
  const claimed = new Set(people.map((p) => p.pronouns));

  for (const sentence of prose.split(/(?<=[.!?])\s+/)) {
    const present = people.filter((p) => new RegExp(`\\b${escapeForRegExp(p.name)}\\b`, 'i').test(sentence));
    if (present.length !== 1) continue;
    const [person] = present;

    for (const key of Object.keys(GENDERED_PRONOUN)) {
      if (key === person.pronouns) continue;
      if (!GENDERED_PRONOUN[key].test(sentence)) continue;

      const sharedSubject = new RegExp(
        `\\b${escapeForRegExp(person.name)}\\b[^,;]{0,60}?\\b${COORDINATED}`,
        'i',
      ).exec(sentence);
      const ownedByOther = claimed.has(key) && person.pronouns !== key;
      if (ownedByOther && !(sharedSubject && sharedSubject[1].toLowerCase() === key)) continue;

      return `${person.name} uses "${person.pronouns}" in scaffold.cast but this scene uses "${key}". Keep each companion's cast pronoun.`;
    }
  }
  return '';
}

/**
 * "three dormant bipeds" then "above the four feet" — body plan vs limb count.
 * Only fires when the scene names a body plan, so stray measurements stay quiet.
 */
export function bodyPlanMismatch(narrative) {
  const text = String(narrative || '');
  const plan = BODY_PLANS.find(({ re }) => re.test(text));
  if (!plan) return '';

  const re = new RegExp(`\\b(${Object.keys(NUMBER_WORDS).join('|')}|\\d+)\\s+(${LIMB_NOUN})\\b`, 'gi');
  let match;
  while ((match = re.exec(text))) {
    if (MEASURE_TAIL.test(text.slice(match.index + match[0].length))) continue;
    const word = match[1].toLowerCase();
    const count = NUMBER_WORDS[word] ?? Number(word);
    if (!Number.isFinite(count) || count === plan.feet) continue;
    return `Scene calls it a ${plan.name} (${plan.feet} feet) but also says "${match[0]}". Keep one body plan.`;
  }
  return '';
}

/** Gnomic verbs: the tell of a moral, not a thing happening on stage. */
const PROVERB_TELL = [
  /\b(always|never)\b[^.!?]{0,40}\b(chooses|choose|wins|win|finds|find|knows|know|remembers|remember|holds|hold|decides|decide|matters|matter|teaches|teach|forgives|forgive|belongs|belong|waits|wait)\b/i,
  /\b(in the end|what matters(\s+most)?\s+is|that('s| is) what .{0,30} means|that('s| is) the (lesson|point|way of it))\b/i,
];

/** Beats close on a seen object or action. A moral spoils the quiz. */
export function proverbCloser(narrative) {
  const paragraphs = String(narrative || '').trim().split(/\n\n+/).filter(Boolean);
  for (const paragraph of paragraphs.slice(-2)) {
    const sentences = splitSentences(paragraph);
    const closer = String(sentences[sentences.length - 1] || paragraph).trim();
    if (!closer) continue;
    if (PROVERB_TELL.some((re) => re.test(closer))) {
      return `Last line "${closer.slice(0, 60)}" is a proverb. End on the seen object or action instead.`;
    }
  }
  return '';
}

const TRIMMABLE_REASON = /\bmax is \d+\. Cut\.$/;

/** Over-length is repaired by trimNarrativeToMaxWords; a lecture just ships. */
export function isTrimmableReason(reason) {
  return TRIMMABLE_REASON.test(String(reason || ''));
}

export function narrativeWordCount(narrative) {
  return String(narrative || '').trim().split(/\s+/).filter(Boolean).length;
}

/** Trailing quotes and stray punctuation are not sentences. */
function splitSentences(text) {
  return (String(text || '').match(/[^.!?]+[.!?]*["'\u201D\u2019]*/g) || [])
    .filter((s) => /[a-z]/i.test(s));
}

/** Whole sentences that fit the budget; '' when not even the first one does. */
function sentencesWithinBudget(paragraph, budget) {
  const kept = [];
  let used = 0;
  for (const sentence of splitSentences(paragraph)) {
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    if (used + words.length > budget) break;
    kept.push(sentence.trim());
    used += words.length;
  }
  return kept.join(' ').trim();
}

export function trimNarrativeToMaxWords(narrative, maxWords) {
  const max = Number(maxWords);
  if (!Number.isFinite(max) || max < 20) return String(narrative || '');
  const parts = String(narrative || '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return '';
  const count = (text) => text.split(/\s+/).filter(Boolean).length;
  if (count(parts.join('\n\n')) <= max) return parts.join('\n\n');

  const last = parts[parts.length - 1];
  const lastN = count(last);
  if (lastN >= max) {
    return sentencesWithinBudget(last, max)
      || last.split(/\s+/).filter(Boolean).slice(0, max).join(' ');
  }

  let budget = max - lastN;
  const body = [];
  for (const para of parts.slice(0, -1)) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length <= budget) {
      body.push(para);
      budget -= words.length;
    } else if (budget > 8) {
      const partial = sentencesWithinBudget(para, budget);
      if (partial) body.push(partial);
      break;
    } else {
      break;
    }
  }
  return [...body, last].join('\n\n');
}

export function knownStoryBlob(skeleton, ctx) {
  const story = Array.isArray(ctx?.storySoFar) ? ctx.storySoFar : [];
  return [
    ...story.flatMap((b) => [b?.summary, b?.hook, b?.concept]),
    ctx?.scaffold?.throughLine,
    ctx?.currentBeat?.title,
    ctx?.currentBeat?.narrativeHint,
    skeleton?.setting,
    skeleton?.shownBeat,
    skeleton?.closeOn,
    skeleton?.sensoryHook,
    ...(Array.isArray(skeleton?.mustShow) ? skeleton.mustShow : []),
  ].filter(Boolean).join(' ');
}

/** "the circle Moss had drawn" when circle was never in the plan or prior beats. */
export function inventedPriorReason(narrative, knownBlob) {
  const known = new Set(contentWords(knownBlob));
  const re = new RegExp(
    `\\bthe\\s+([a-z]{4,})\\s+(?:\\w+\\s+){0,3}had\\s+(${PRIOR_VERB})\\b`,
    'gi',
  );
  let match;
  while ((match = re.exec(String(narrative || '')))) {
    const noun = String(match[1] || '').toLowerCase();
    if (STOP.has(noun) || known.has(noun)) continue;
    return `Do not refer to "the ${noun}" as if it already happened. Stay with this beat's setting and story so far.`;
  }
  return '';
}

export function writeRetryReasons(parsed, skeleton, ctx) {
  const reasons = [];
  const narrative = parsed?.narrative || '';
  const maxWords = Number(ctx?.ageBudget?.maxWords);

  if (writeFlipsPolarity(skeleton, narrative)) {
    reasons.push('Scene flipped a planned fact (higher/lower, stuck/loose). Keep mustShow polarity.');
  }
  if (!quizAgreesWithScene(parsed?.checkpoint, narrative)) {
    reasons.push('Correct quiz option must use words from the scene.');
  }
  if (quizFlipsSkeleton(parsed?.checkpoint, skeleton)) {
    reasons.push('Quiz flipped the planned fact. Match skeleton.checkpointPlan and mustShow.');
  }
  if (Number.isFinite(maxWords) && narrativeWordCount(narrative) > maxWords) {
    reasons.push(`Narrative is ${narrativeWordCount(narrative)} words; max is ${maxWords}. Cut.`);
  }
  const lectures = lectureLinesInNarrative(narrative);
  if (lectures.length) {
    reasons.push('Companions argue about what to DO. Do not explain the idea in dialogue. Short action lines only.');
  }
  if (understandingCloser(narrative)) {
    reasons.push('Do not close on someone understanding. End on the seen object or action.');
  }
  const prior = inventedPriorReason(narrative, knownStoryBlob(skeleton, ctx));
  if (prior) reasons.push(prior);
  const bodyPlan = bodyPlanMismatch(narrative);
  if (bodyPlan) reasons.push(bodyPlan);
  const pronoun = pronounDriftReason(narrative, ctx?.scaffold?.cast);
  if (pronoun) reasons.push(pronoun);
  const proverb = proverbCloser(narrative);
  if (proverb) reasons.push(proverb);

  return reasons;
}
