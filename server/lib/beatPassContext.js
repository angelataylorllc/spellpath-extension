import { getAgeBudget } from '../../lib/ageBand.js';
import { getLiteralness } from '../../lib/literalness.js';
import { compactGenreNote } from '../../lib/genreVoice.js';
import { findAuthorCard, formatCuratedAuthorGuide } from '../../lib/authorVoiceCards.js';
import { looksLikeThemeSpeech } from './beatGuards.js';
import { lookupAuthorVoiceGuide } from './resolveAuthorVoice.js';

function slimCast(cast) {
  return (Array.isArray(cast) ? cast : []).map((c) => ({
    name: c?.name || '',
    role: c?.role || '',
    pronouns: c?.pronouns || '',
    aspects: Array.isArray(c?.aspects) ? c.aspects.slice(0, 3) : [],
    voice: c?.voice || '',
  }));
}

function slimStorySoFar(storySoFar) {
  return (Array.isArray(storySoFar) ? storySoFar : []).slice(-3).map((b) => ({
    concept: b?.concept || '',
    summary: b?.summary || b?.beatSummary || '',
    hook: b?.unresolvedHook || b?.hook || '',
  }));
}

function slimCheckpoints(recentCheckpoints) {
  return (Array.isArray(recentCheckpoints) ? recentCheckpoints : []).slice(-2).map((c) => ({
    concept: c?.concept || '',
    correct: Boolean(c?.correct),
    selectedLabel: c?.selectedLabel || '',
  }));
}

/**
 * Shared slim context for beat skeleton / write / restyle. Avoids dumping the full scaffold.
 */
export function buildBeatPassContext({
  scaffold,
  currentBeat,
  learnerProfile,
  storySoFar,
  recentCheckpoints,
  learnerDirection,
  genre,
  mode,
  beatIndex,
  totalBeats,
  previousNarrativeOpening,
  alreadyTaught,
}) {
  const ageBudget = getAgeBudget(learnerProfile?.age);
  const literalness = getLiteralness({
    learningFocus: scaffold?.learningFocus || learnerProfile?.learningFocus,
    motivation: scaffold?.motivation || learnerProfile?.motivation,
  });
  const genreId = genre || scaffold?.theme?.genre || 'adventure';
  const looked = lookupAuthorVoiceGuide(scaffold?.authorStyle);
  const card = findAuthorCard(scaffold?.authorStyle);
  const authorStyleGuide = card
    ? formatCuratedAuthorGuide(card, { compact: true, includeSample: true })
    : looked.source === 'generic' && scaffold?.authorVoiceGuide
      ? scaffold.authorVoiceGuide
      : looked.compactGuide || looked.guide || scaffold?.authorVoiceGuide || '';
  const authorCadence = String(card?.samples?.[0] || '').trim();
  const authorStyle = String(scaffold?.authorStyle || '').trim();
  const isLastBeat = beatIndex >= totalBeats - 1;
  const isRemedial = Boolean(currentBeat?.isRemedial);

  return {
    ageBudget,
    literalness,
    genre: compactGenreNote(genreId),
    mode: mode || scaffold?.theme?.mode || 'day',
    authorStyle,
    authorStyleGuide,
    authorCadence,
    restyleAuthor: Boolean(authorStyle && authorStyleGuide),
    isLastBeat,
    isRemedial,
    beatIndex,
    totalBeats,
    alreadyTaught,
    currentConcept: learnerDirection?.concept || currentBeat?.concept || '',
    learnerDirection: learnerDirection
      ? {
          concept: learnerDirection.concept || '',
          speaker: learnerDirection.speaker || '',
          label: learnerDirection.label || '',
        }
      : null,
    previousNarrativeOpening:
      typeof previousNarrativeOpening === 'string' && previousNarrativeOpening.trim()
        ? previousNarrativeOpening.trim().slice(0, 400)
        : null,
    scaffold: {
      subject: scaffold?.subject || '',
      topicType: scaffold?.topicType || 'concept',
      topicCategory: scaffold?.topicCategory || 'standard',
      motivation: scaffold?.motivation || '',
      learningFocus: scaffold?.learningFocus || '',
      learningGoalsSummary: scaffold?.learningGoalsSummary || '',
      throughLine: scaffold?.throughLine || '',
      cast: slimCast(scaffold?.cast),
      mustCover: scaffold?.mustCover || [],
      optionalPool: scaffold?.optionalPool || [],
    },
    currentBeat: {
      id: currentBeat?.id || '',
      title: currentBeat?.title || '',
      concept: currentBeat?.concept || '',
      narrativeHint: currentBeat?.narrativeHint || '',
      checkpointFocus: currentBeat?.checkpointFocus || '',
      isRemedial,
    },
    learnerProfile: {
      age: ageBudget.age,
      level: learnerProfile?.level || 'beginner',
      confirmedUnderstandings: learnerProfile?.confirmedUnderstandings || [],
      misconceptions: (learnerProfile?.misconceptions || []).slice(-2),
    },
    storySoFar: slimStorySoFar(storySoFar),
    recentCheckpoints: slimCheckpoints(recentCheckpoints),
  };
}

export function normalizeSkeletonPlan(raw, ctx) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const fork = ctx.isLastBeat || ctx.isRemedial
    ? []
    : (Array.isArray(s.forkPitches) ? s.forkPitches : [])
        .filter((p) => p && typeof p === 'object')
        .slice(0, 3)
        .map((p) => ({
          speaker: String(p.speaker || '').trim().slice(0, 40),
          label: String(p.label || p.topic || '').trim().slice(0, 72),
          concept: String(p.concept || '').trim().slice(0, 160),
        }))
        .filter((p) => p.label && p.concept);

  const wrongs = Array.isArray(s.checkpointPlan?.wrongs)
    ? s.checkpointPlan.wrongs.map((w) => String(w || '').trim()).filter(Boolean).slice(0, 2)
    : [];

  return {
    shownBeat: String(s.shownBeat || ctx.currentBeat?.narrativeHint || '').slice(0, 160),
    proxyClaim: String(s.proxyClaim || '').trim().slice(0, 120),
    plainConcept: String(s.plainConcept || ctx.currentConcept || '').slice(0, 160),
    setting: String(s.setting || '').slice(0, 200),
    sensoryHook: String(s.sensoryHook || '').slice(0, 120),
    mustShow: (Array.isArray(s.mustShow) ? s.mustShow : []).map((x) => String(x).slice(0, 80)).slice(0, 4),
    mustNot: [
      ...new Set([
        ...(Array.isArray(s.mustNot) ? s.mustNot : []).map((x) => String(x).slice(0, 80)),
        'lyric or proverb last line',
        'personified moral (listened, wonder, oldest trade)',
      ]),
    ].slice(0, 6),
    spokenPlan: (Array.isArray(s.spokenPlan) ? s.spokenPlan : [])
      .map((x) => String(x).slice(0, 80))
      .filter((line) => line && !looksLikeThemeSpeech(line))
      .slice(0, 8),
    forkPitches: fork,
    recapTitle: String(s.recapTitle || s.plainConcept || ctx.currentBeat?.title || '').trim().slice(0, 48),
    closeOn: String(s.closeOn || s.shownBeat || '').trim().slice(0, 80),
    checkpointPlan: {
      question: String(s.checkpointPlan?.question || '').slice(0, 120),
      correct: String(s.checkpointPlan?.correct || '').slice(0, 80),
      wrongs,
    },
  };
}

/** The token ceilings are server plumbing; sending them to the model is pure cost. */
const SERVER_ONLY_BUDGET_KEYS = new Set(['maxTokens', 'skeletonMaxTokens', 'restyleMaxTokens']);

function modelAgeBudget(ageBudget) {
  return Object.fromEntries(
    Object.entries(ageBudget || {}).filter(([key]) => !SERVER_ONLY_BUDGET_KEYS.has(key)),
  );
}

export function skeletonPayload(ctx, retryReason) {
  const payload = {
    ageBudget: modelAgeBudget(ctx.ageBudget),
    literalness: ctx.literalness,
    genre: ctx.genre,
    beatIndex: ctx.beatIndex,
    totalBeats: ctx.totalBeats,
    isLastBeat: ctx.isLastBeat,
    isRemedial: ctx.isRemedial,
    alreadyTaught: ctx.alreadyTaught,
    learnerDirection: ctx.learnerDirection,
    previousNarrativeOpening: ctx.previousNarrativeOpening,
    scaffold: ctx.scaffold,
    currentBeat: ctx.currentBeat,
    learnerProfile: ctx.learnerProfile,
    storySoFar: ctx.storySoFar,
    recentCheckpoints: ctx.recentCheckpoints,
  };
  if (retryReason) payload.retryReason = retryReason;
  return payload;
}

/**
 * The skeleton is the distillation of the scaffold, so re-sending the whole thing
 * pays twice for one idea. Cast (names, pronouns, voice) and the through-line are
 * the parts the plan does not carry. Genre is deliberately absent: the write
 * prompt takes genre from skeleton.setting and is told not to add more.
 */
function writeScaffold(scaffold) {
  return {
    subject: scaffold?.subject || '',
    throughLine: scaffold?.throughLine || '',
    cast: scaffold?.cast || [],
  };
}

export function writePayload(ctx, skeleton, retryReason) {
  const payload = {
    skeleton,
    ageBudget: modelAgeBudget(ctx.ageBudget),
    literalness: ctx.literalness,
    beatIndex: ctx.beatIndex,
    totalBeats: ctx.totalBeats,
    isLastBeat: ctx.isLastBeat,
    isRemedial: ctx.isRemedial,
    learnerDirection: ctx.learnerDirection,
    previousNarrativeOpening: ctx.previousNarrativeOpening,
    scaffold: writeScaffold(ctx.scaffold),
    learnerProfile: ctx.learnerProfile,
    storySoFar: ctx.storySoFar,
    recentCheckpoints: ctx.recentCheckpoints,
  };
  if (retryReason) payload.retryReason = retryReason;
  return payload;
}

export function restylePayload(ctx, narrative, retryNote) {
  const payload = {
    narrative,
    ageBudget: modelAgeBudget(ctx.ageBudget),
    authorStyleGuide: ctx.authorStyleGuide,
    authorCadence: ctx.authorCadence || '',
    note: 'Quoted lines are __D#__ placeholders — copy them exactly. Restyle narrator only. Last paragraph omitted; do not add a closer.',
  };
  if (retryNote) payload.retryReason = retryNote;
  return payload;
}

export function splitNarrativeParagraphs(narrative) {
  return String(narrative || '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function joinNarrativeParagraphs(paragraphs) {
  return (Array.isArray(paragraphs) ? paragraphs : []).filter(Boolean).join('\n\n');
}

/** Pin the last paragraph so restyle cannot replace the closer or fork. */
export function pinLastParagraph(narrative) {
  const parts = splitNarrativeParagraphs(narrative);
  if (parts.length < 2) {
    return { body: String(narrative || '').trim(), pinned: '', bodyCount: parts.length };
  }
  const pinned = parts.pop();
  return { body: joinNarrativeParagraphs(parts), pinned, bodyCount: parts.length };
}

export function stitchPinnedParagraph(restyledBody, pinned, bodyCount) {
  let parts = splitNarrativeParagraphs(restyledBody);
  if (Number.isFinite(bodyCount) && bodyCount > 0 && parts.length > bodyCount) {
    parts = parts.slice(0, bodyCount);
  }
  const pin = String(pinned || '').trim();
  if (pin) parts.push(pin);
  return joinNarrativeParagraphs(parts);
}

/** Mask quoted speech so restyle can only touch narrator craft. */
export function pinSpokenQuotes(narrative) {
  const quotes = [];
  const body = String(narrative || '').replace(/"[^"]*"/g, (chunk) => {
    quotes.push(chunk);
    return `"__D${quotes.length}__"`;
  });
  return { body, quotes };
}

/** Put original quotes back. Returns null if the restyle dropped placeholders. */
export function stitchSpokenQuotes(restyled, quotes) {
  if (!Array.isArray(quotes) || quotes.length === 0) {
    return String(restyled || '');
  }
  const found = new Set();
  let text = String(restyled || '').replace(/"__D(\d+)__"/g, (match, n) => {
    const idx = Number(n) - 1;
    const quote = quotes[idx];
    if (!quote) return match;
    found.add(idx);
    return quote;
  });
  text = text.replace(/__D(\d+)__/g, (match, n) => {
    const idx = Number(n) - 1;
    const quote = quotes[idx];
    if (!quote) return match;
    found.add(idx);
    return quote;
  });
  if (found.size < quotes.length) return null;
  return text;
}
