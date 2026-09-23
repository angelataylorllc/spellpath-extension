import { callLLM } from './llm/callLLM.js';
import { checkpointOptionsValid, normalizeBeatResponse } from './normalizeBeat.js';
import {
  isTrimmableReason,
  narrativeWordCount,
  skeletonPlanWeak,
  trimNarrativeToMaxWords,
  writeRetryReasons,
} from './beatGuards.js';
import { beatSkeletonPrompt } from '../prompts/beatSkeleton.js';
import { beatWritePrompt } from '../prompts/beatWrite.js';
import { beatRestylePrompt } from '../prompts/beatRestyle.js';
import {
  buildBeatPassContext,
  normalizeSkeletonPlan,
  pinLastParagraph,
  pinSpokenQuotes,
  restylePayload,
  skeletonPayload,
  stitchPinnedParagraph,
  stitchSpokenQuotes,
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
    if (skeletonPlanWeak(skeleton)) {
      console.warn('[spellpath] beat skeleton was a definition/lecture; retrying once…');
      skeleton = normalizeSkeletonPlan(
        await callLLM(req, 'beat-skeleton', {
          systemPrompt: beatSkeletonPrompt,
          userPayload: skeletonPayload(
            ctx,
            'shownBeat must be an action you can film. spokenPlan is the next action, not a definition.',
          ),
          maxTokens: ctx.ageBudget.skeletonMaxTokens,
          temperature: 0.35,
        }),
        ctx,
      );
    }
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

  /**
   * Faults the pipeline can repair itself cost far less than faults that ship.
   * An over-long beat gets trimmed; a lecture or a wrong fact reaches the reader.
   */
  const faultsOf = (beat) => {
    const reasons = [];
    let weight = 0;
    if (!checkpointOptionsValid(beat?.checkpoint)) {
      reasons.push('Previous checkpoint options were invalid. Return exactly 3 distinct option strings and a valid correctIndex.');
      weight += 100;
    }
    for (const reason of writeRetryReasons(beat, skeleton, ctx)) {
      reasons.push(reason);
      weight += isTrimmableReason(reason) ? 1 : 10;
    }
    return { reasons, weight };
  };

  const withRecapTitle = (beat) => (String(beat?.recapTitle || '').trim()
    ? beat
    : { ...beat, recapTitle: skeleton.recapTitle });

  parsed = withRecapTitle(parsed);
  let faults = faultsOf(parsed);

  if (faults.reasons.length) {
    console.warn('[spellpath] beat write retry:', faults.reasons.join(' | '));
    const retried = withRecapTitle(normalizeBeatResponse(await callLLM(req, 'beat-write', {
      systemPrompt: beatWritePrompt,
      userPayload: writePayload(ctx, skeleton, faults.reasons.join(' ')),
      maxTokens: ctx.ageBudget.maxTokens,
      temperature: 0.65,
    }), beatNormalizeCtx));
    const retriedFaults = faultsOf(retried);

    if (retriedFaults.weight <= faults.weight) {
      parsed = retried;
      faults = retriedFaults;
    } else {
      console.warn('[spellpath] retry was worse; keeping first write:', retriedFaults.reasons.join(' | '));
    }
  }

  const maxWords = Number(ctx.ageBudget.maxWords);
  const capWords = (beat) => {
    if (!Number.isFinite(maxWords) || narrativeWordCount(beat?.narrative) <= maxWords) return beat;
    return { ...beat, narrative: trimNarrativeToMaxWords(beat.narrative, maxWords) };
  };

  // Score after trimming: length complaints raised above are already repaired here,
  // so anything still standing is a fault the reader would actually meet.
  parsed = capWords(parsed);
  faults = faultsOf(parsed);

  if (ctx.restyleAuthor && typeof parsed?.narrative === 'string' && parsed.narrative.trim()) {
    const { body, pinned, bodyCount } = pinLastParagraph(parsed.narrative);
    const { body: masked, quotes } = pinSpokenQuotes(body || parsed.narrative);

    /** Returns stitched prose, or null when the pass lost a __D#__ placeholder. */
    const attemptRestyle = async (retryNote) => {
      const restyled = await callLLM(req, 'beat-restyle', {
        systemPrompt: beatRestylePrompt,
        userPayload: restylePayload(ctx, masked, retryNote),
        maxTokens: ctx.ageBudget.restyleMaxTokens,
        temperature: retryNote ? 0.6 : 0.7,
      });
      if (typeof restyled?.narrative !== 'string' || !restyled.narrative.trim()) return null;
      return stitchSpokenQuotes(restyled.narrative, quotes);
    };

    try {
      let withQuotes = await attemptRestyle();
      if (withQuotes == null && quotes.length) {
        console.warn(`[spellpath] beat restyle dropped dialogue pins (${quotes.length} expected); retrying once…`);
        withQuotes = await attemptRestyle(
          `Your last attempt dropped placeholders. The narrative contains exactly ${quotes.length} placeholders `
          + `("__D1__" through "__D${quotes.length}__"). Every one must appear in your output, in order, unchanged. `
          + 'Restyle only the narrator sentences around them.',
        );
      }
      if (withQuotes == null) {
        console.warn('[spellpath] beat restyle dropped dialogue pins twice; keeping write body');
      } else {
        const narrative = pinned
          ? stitchPinnedParagraph(withQuotes, pinned, bodyCount)
          : withQuotes;
        const restyledBeat = capWords(normalizeBeatResponse(
          { ...parsed, narrative },
          beatNormalizeCtx,
        ));
        const restyledFaults = faultsOf(restyledBeat);

        /*
         * The restyle rewrites narrator sentences, so it can introduce the very
         * faults the draft was checked for. Ties go to the restyle — that is the
         * author voice, and keeping it is the point of the pass. Falling back to
         * the draft costs nothing because we already have it.
         */
        if (restyledFaults.weight <= faults.weight) {
          parsed = restyledBeat;
          faults = restyledFaults;
        } else {
          const introduced = restyledFaults.reasons.filter((r) => !faults.reasons.includes(r));
          console.warn(
            '[spellpath] restyle broke what the draft had right; keeping the draft:',
            (introduced.length ? introduced : restyledFaults.reasons).join(' | '),
          );
        }
      }
    } catch (err) {
      console.warn('[spellpath] beat restyle failed; keeping write narrative:', err?.message || err);
    }
  }

  if (faults.reasons.length) {
    console.warn('[spellpath] beat shipped with:', faults.reasons.join(' | '));
  }

  console.log(
    '[spellpath] beat passes:',
    ctx.restyleAuthor ? 'skeleton+write+restyle' : 'skeleton+write',
    ctx.ageBudget.age,
    ctx.authorStyle || 'no-author',
  );

  return parsed;
}
