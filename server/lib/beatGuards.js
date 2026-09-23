/** Small, cheap checks for beat skeleton + write. Prefer retry over longer prompts. */

const STOP = new Set([
  'that', 'this', 'with', 'from', 'they', 'them', 'then', 'when', 'what',
  'your', 'their', 'have', 'been', 'were', 'will', 'into', 'only', 'just',
  'than', 'also', 'over', 'after', 'before', 'about', 'does', 'dont',
  'not', 'the', 'and', 'for', 'are', 'but', 'was', 'can', 'she', 'his',
  'her', 'you', 'had',
]);

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

export function spokenLinesInNarrative(narrative) {
  return (String(narrative || '').match(/"[^"]+"/g) || []).map((q) => q.slice(1, -1));
}

export function lectureLinesInNarrative(narrative) {
  return spokenLinesInNarrative(narrative).filter(looksLikeThemeSpeech);
}

/** "4-5" and "5+" both floor at 4 and 5. */
export function spokenLinesMin(spec) {
  const first = String(spec || '').match(/\d+/);
  return first ? Number(first[0]) : 0;
}

/**
 * The band asks for conversation and the beat delivered one line. Nothing else
 * enforced the floor, so "no lectures" quietly became "no talking".
 */
export function spokenLineShortfall(narrative, ctx) {
  const min = spokenLinesMin(ctx?.ageBudget?.spokenLines);
  if (min < 2) return '';
  const count = spokenLinesInNarrative(narrative).length;
  if (count >= min) return '';
  return `Scene has ${count} spoken line${count === 1 ? '' : 's'}; this age band wants ${ctx.ageBudget.spokenLines}. `
    + 'Let the companions talk — react, disagree, decide what to try next. They still must not explain the mechanism.';
}

export function skeletonPlanWeak(skeleton) {
  if (!skeleton || typeof skeleton !== 'object') return true;
  if (looksLikeDefinition(skeleton.shownBeat)) return true;
  const spoken = Array.isArray(skeleton.spokenPlan) ? skeleton.spokenPlan : [];
  return spoken.some(looksLikeThemeSpeech);
}

/** Words that only ever appear on a chart the cast points at, never in the action. */
const REPRESENTATION = /\b(chart|diagram|map|mapped|ledger|tally|label(led|ed)?|drawing|sketch|table|figure|caption|annotat\w*)\b/i;

function correctLabel(checkpoint) {
  return (checkpoint?.options || []).find((o) => o && o.correct)?.label || '';
}

/**
 * The answer has to be sayable from what the reader watched. Half the correct
 * option's content words must appear in the scene — a beat that demonstrates
 * coffee dissolving carbonate cannot then ask about caffeine and parietal cells.
 */
export function quizVocabularyGapReason(checkpoint, narrative) {
  const label = correctLabel(checkpoint);
  if (!label) return 'Checkpoint has no correct option. Mark exactly one option correct.';
  const words = contentWords(label);
  if (!words.length) return '';

  const present = stemSet(narrative);
  const missing = words.filter((w) => !present.has(stem(w)));
  const needed = Math.max(2, Math.ceil(words.length / 2));
  if (words.length - missing.length >= needed) return '';

  return `Correct answer leans on words the scene never used: ${missing.slice(0, 6).join(', ')}. `
    + 'Ask about what the reader actually watched happen, in the words the scene used for it.';
}

/**
 * The lesson got conveyed by a diagram instead of the action, then tested. The
 * skeleton already bans drawings as the shown beat; this catches the relocation
 * into a wall chart beside a real proxy.
 */
export function quizTestsDiagramOnlyReason(checkpoint, narrative) {
  const words = contentWords(correctLabel(checkpoint)).filter((w) => w.length > 5);
  if (!words.length) return '';

  const sentences = splitSentences(String(narrative || '').replace(/\n+/g, ' '));
  for (const word of words) {
    const key = stem(word);
    const mentions = sentences.filter((s) => stemSet(s).has(key));
    if (!mentions.length || !mentions.every((s) => REPRESENTATION.test(s))) continue;
    return `"${word}" only appears on a chart or label, then the quiz tests it. `
      + 'Show it happening in the action, or ask about something the scene actually demonstrated.';
  }
  return '';
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
 * Folds the endings that made guards fire on words the scene did use: "fizzed"
 * against "fizz", "acidic" against "acid", "reaction" against "react". Longest
 * suffix first, and never below four characters, so "bring" is not cut to "br"
 * while "brings" becomes "bring". A false retry costs a whole write call, which
 * is why this is worth more than it looks.
 */
const STEM_SUFFIXES = ['ions', 'ion', 'ies', 'ing', 'ed', 'es', 'ic', 's', 'e'];

function stem(word) {
  const w = String(word);
  for (const suffix of STEM_SUFFIXES) {
    if (!w.endsWith(suffix)) continue;
    const cut = w.slice(0, -suffix.length);
    if (cut.length >= 4) return cut;
  }
  return w;
}

/**
 * Plain English that happens to sit in a concept sentence. "the stomach answers
 * with more acid" has two real terms, not five: demanding the beat also say
 * "answers" and "more" bought retries and taught nothing.
 */
const GENERIC = new Set([
  'thing', 'things', 'kind', 'sort', 'part', 'parts', 'point', 'reason', 'course',
  'matter', 'sense', 'case', 'time', 'times', 'place', 'right', 'true', 'real',
  'precise', 'exactly', 'rather', 'quite', 'almost', 'said', 'learned',
  'answer', 'answers', 'more', 'less', 'make', 'makes', 'made', 'add', 'adds',
  'take', 'takes', 'give', 'gives', 'come', 'comes', 'turn', 'turns', 'keep',
  'keeps', 'show', 'shows', 'know', 'knows', 'need', 'needs', 'want', 'wants',
  'help', 'helps', 'happen', 'happens', 'own', 'same', 'other', 'another',
]);

function isGeneric(word) {
  return GENERIC.has(word) || GENERIC.has(stem(word));
}

function stemSet(text) {
  return new Set(contentWords(text).map(stem));
}

/** Stems worth requiring: domain vocabulary, not the English around it. */
function termSet(text) {
  return new Set(contentWords(text).filter((w) => !isGeneric(w)).map(stem));
}

/**
 * The metaphor ate the subject: a beat about coffee and stomach acid that never
 * says coffee, stomach, or acid. Compares the beat against the words the plan
 * itself used, so it needs no per-topic vocabulary list. Quiet when the plan
 * carries no usable terms.
 */
export function unanchoredMetaphorReason(narrative, skeleton, ctx) {
  const needed = Number(ctx?.literalness?.realTermsMin);
  if (!Number.isFinite(needed) || needed < 1) return '';

  const terms = termSet([
    skeleton?.plainConcept,
    ctx?.currentConcept,
    ctx?.scaffold?.subject,
  ].filter(Boolean).join(' '));
  if (terms.size < needed) return '';

  const present = stemSet(narrative);
  const found = [...terms].filter((t) => present.has(t));
  if (found.length >= needed) return '';

  const missing = [...terms].filter((t) => !present.has(t)).slice(0, 5);
  return `Beat names only ${found.length} of the real terms; ${ctx.literalness.level} needs ${needed}. `
    + `Missing: ${missing.join(', ')}. ${ctx.literalness.naming}`;
}

/** Identity, composition and causation — the verbs an invented property arrives on. */
const CLAIM_VERB = new RegExp(
  '\\b(is|are|was|were|lines?|lined|contains?|contained|consists?|comprises?|made'
  + '|reacts?|reacted|causes?|caused|produces?|produced|releases?|released'
  + '|triggers?|triggered|persists?|persisted|means|holds?|neutralis|neutraliz'
  + '|forms?|formed|becomes?|carries|carried|comes from)\\b',
  'i',
);

function planTerms(skeleton, ctx) {
  return stemSet([
    skeleton?.proxyClaim,
    skeleton?.plainConcept,
    skeleton?.shownBeat,
    ...(Array.isArray(skeleton?.mustShow) ? skeleton.mustShow : []),
    ctx?.currentConcept,
    ctx?.scaffold?.subject,
  ].filter(Boolean).join(' '));
}

/**
 * Asides in the shape "the calcium carbonate (the mineral that lined the stomach)"
 * and "caffeine and chlorogenic acid—substances that persist in the brew". The
 * aside is where an invented property gets smuggled in: it names a real term the
 * plan knows, asserts something about it, and the assertion uses words the plan
 * never supplied. Author-voice asides that make no claim about the subject are
 * left alone, which is most of them.
 */
export function unsourcedAsideReason(narrative, skeleton, ctx) {
  const terms = planTerms(skeleton, ctx);
  if (terms.size < 2) return '';
  const text = String(narrative || '').replace(/\s+/g, ' ');

  const spans = [
    ...[...text.matchAll(/\(([^)]{8,240})\)/g)].map((m) => m[1]),
    ...[...text.matchAll(/[—–]([^—–.!?]{8,160})(?=[—–.!?]|$)/g)].map((m) => m[1]),
  ];

  for (const body of spans) {
    if (!CLAIM_VERB.test(body)) continue;
    // The real term must be inside the aside. A voice aside next to one ("he
    // reached for the pH paper (there was a filing system for this…)") is not a
    // claim about it, and flagging those cost a full retry for nothing.
    const about = [...stemSet(body)].some((w) => terms.has(w));
    if (!about) continue;
    const unsourced = contentWords(body)
      .filter((w) => !isGeneric(w) && !terms.has(stem(w)));
    if (unsourced.length < 2) continue;
    return `Aside "${body.trim().slice(0, 70)}" explains the subject with facts the plan never gave `
      + `(${unsourced.slice(0, 4).join(', ')}). Name the real thing without explaining it, or cut the aside. `
      + 'Only skeleton.proxyClaim may explain why something behaves as it does.';
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

export function writeRetryReasons(parsed, skeleton, ctx) {
  const reasons = [];
  const narrative = parsed?.narrative || '';
  const maxWords = Number(ctx?.ageBudget?.maxWords);

  const quizGap = quizVocabularyGapReason(parsed?.checkpoint, narrative);
  if (quizGap) reasons.push(quizGap);
  const quizDiagram = quizTestsDiagramOnlyReason(parsed?.checkpoint, narrative);
  if (quizDiagram) reasons.push(quizDiagram);
  if (Number.isFinite(maxWords) && narrativeWordCount(narrative) > maxWords) {
    reasons.push(`Narrative is ${narrativeWordCount(narrative)} words; max is ${maxWords}. Cut.`);
  }
  const lectures = lectureLinesInNarrative(narrative);
  if (lectures.length) {
    reasons.push('Companions argue about what to DO. Do not explain the idea in dialogue.');
  }
  const tooQuiet = spokenLineShortfall(narrative, ctx);
  if (tooQuiet) reasons.push(tooQuiet);
  const bodyPlan = bodyPlanMismatch(narrative);
  if (bodyPlan) reasons.push(bodyPlan);
  const pronoun = pronounDriftReason(narrative, ctx?.scaffold?.cast);
  if (pronoun) reasons.push(pronoun);
  const unanchored = unanchoredMetaphorReason(narrative, skeleton, ctx);
  if (unanchored) reasons.push(unanchored);
  const aside = unsourcedAsideReason(narrative, skeleton, ctx);
  if (aside) reasons.push(aside);
  const proverb = proverbCloser(narrative);
  if (proverb) reasons.push(proverb);

  return reasons;
}
