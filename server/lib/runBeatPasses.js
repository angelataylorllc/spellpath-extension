import { callLLM } from './llm/callLLM.js';
import { checkpointOptionsValid, normalizeBeatResponse } from './normalizeBeat.js';
import { beatSkeletonPrompt } from '../prompts/beatSkeleton.js';
import { beatWritePrompt } from '../prompts/beatWrite.js';
import { beatRestylePrompt } from '../prompts/beatRestyle.js';
import {
  buildBeatPassContext,
  normalizeSkeletonPlan,
  pinLastParagraph,
  restylePayload,
  skeletonPayload,
  stitchPinnedParagraph,
  writePayload,
} from './beatPassContext.js';

/**
 * Skeleton → aged prose+quiz → optional author restyle (skipped when no author).
 */
export async function runBeatPasses(req, body) {
  const {
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
  } = body;

  const resolvedBeatIndex = Number.isFinite(beatIndex) ? beatIndex : 0;
  const resolvedTotalBeats = Number.isFinite(totalBeats) ? totalBeats : scaffold?.beats?.length ?? 0;

  const taught = [
    ...((learnerProfile && learnerProfile.confirmedUnderstandings) || []),
    ...((storySoFar || []).map((b) => b && b.concept).filter(Boolean)),
  ];
  const alreadyTaught = [...new Set(taught.map((s) => String(s).trim()).filter(Boolean))];

  const ctx = buildBeatPassContext({
    scaffold,
    currentBeat,
    learnerProfile,
    storySoFar,
    recentCheckpoints,
    learnerDirection: learnerDirection || null,
    genre,
    mode,
    beatIndex: resolvedBeatIndex,
    totalBeats: resolvedTotalBeats,
    previousNarrativeOpening,
    alreadyTaught,
  });

  let skeleton;
  try {
    skeleton = normalizeSkeletonPlan(
      await callLLM(req, 'beat-skeleton', {
        systemPrompt: beatSkeletonPrompt,
        userPayload: skeletonPayload(ctx),
        maxTokens: ctx.ageBudget.skeletonMaxTokens,
        temperature: 0.4,
      }),
      ctx,
    );
  } catch (err) {
    console.warn('[spellpath] beat skeleton failed; writing from currentBeat only:', err?.message || err);
    skeleton = normalizeSkeletonPlan({}, ctx);
  }

  const beatNormalizeCtx = {
    isLastBeat: ctx.isLastBeat,
    isRemedial: ctx.isRemedial,
    cast: scaffold?.cast,
    optionalPool: scaffold?.optionalPool,
    alreadyTaught,
    currentConcept: ctx.currentConcept,
  };

  let parsed = normalizeBeatResponse(await callLLM(req, 'beat-write', {
    systemPrompt: beatWritePrompt,
    userPayload: writePayload(ctx, skeleton),
    maxTokens: ctx.ageBudget.maxTokens,
    temperature: 0.78,
  }), beatNormalizeCtx);

  if (!String(parsed?.recapTitle || '').trim()) {
    parsed = { ...parsed, recapTitle: skeleton.recapTitle };
  }

  if (!checkpointOptionsValid(parsed?.checkpoint)) {
    console.warn('[spellpath] beat checkpoint options invalid; retrying write once…');
    parsed = normalizeBeatResponse(await callLLM(req, 'beat-write', {
      systemPrompt: beatWritePrompt,
      userPayload: writePayload(
        ctx,
        skeleton,
        'Previous checkpoint options were invalid. Return exactly 3 distinct option strings and a valid correctIndex.',
      ),
      maxTokens: ctx.ageBudget.maxTokens,
      temperature: 0.65,
    }), beatNormalizeCtx);
    if (!String(parsed?.recapTitle || '').trim()) {
      parsed = { ...parsed, recapTitle: skeleton.recapTitle };
    }
  }

  if (ctx.restyleAuthor && typeof parsed?.narrative === 'string' && parsed.narrative.trim()) {
    const { body, pinned, bodyCount } = pinLastParagraph(parsed.narrative);
    try {
      const restyleSource = body || parsed.narrative;
      const restyled = await callLLM(req, 'beat-restyle', {
        systemPrompt: beatRestylePrompt,
        userPayload: restylePayload(ctx, restyleSource),
        maxTokens: ctx.ageBudget.restyleMaxTokens,
        temperature: 0.7,
      });
      if (typeof restyled?.narrative === 'string' && restyled.narrative.trim()) {
        const narrative = pinned
          ? stitchPinnedParagraph(restyled.narrative, pinned, bodyCount)
          : restyled.narrative;
        parsed = normalizeBeatResponse(
          { ...parsed, narrative },
          beatNormalizeCtx,
        );
      }
    } catch (err) {
      console.warn('[spellpath] beat restyle failed; keeping write narrative:', err?.message || err);
    }
  }

  console.log(
    '[spellpath] beat passes:',
    ctx.restyleAuthor ? 'skeleton+write+restyle' : 'skeleton+write',
    ctx.ageBudget.age,
    ctx.authorStyle || 'no-author',
  );

  return parsed;
}
