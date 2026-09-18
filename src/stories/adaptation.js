/** Minimum wrong answers on the same concept before inserting a remedial beat. */
export const REMEDIAL_MISCONCEPTION_THRESHOLD = 2;

export function slugifyConcept(concept) {
  return String(concept || 'concept')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48) || 'concept';
}

export function countMisconceptionsForConcept(misconceptions, concept) {
  if (!concept) return 0;
  return misconceptions.filter(m => m.concept === concept).length;
}

export function buildRemedialBeat({ concept, wrongAnswer, beatIndex }) {
  const slug = slugifyConcept(concept);
  return {
    id: `remedial_${slug}_${beatIndex}`,
    title: `Practice: ${concept}`,
    concept,
    narrativeHint:
      `Remedial beat: the learner missed "${wrongAnswer || 'a key idea'}" twice on ${concept}. ` +
      'Reteach through a fresh scene with a simpler example. Make the correction unmistakable in dialogue.',
    checkpointFocus:
      `Verify the learner now understands ${concept} — test the exact idea they missed, not trivia.`,
    flexibility: 'soft',
    isRemedial: true,
  };
}

/**
 * @returns {{ type: 'revisit' | 'remedial', concept: string, message: string } | null}
 */
export function getAdaptationNotice({
  correct,
  concept,
  misconceptions,
  remedialAlreadyScheduled,
  isLastBeat,
}) {
  if (correct || !concept) return null;

  if (isLastBeat) {
    return {
      type: 'revisit',
      concept,
      message: 'This was the last scene — sit with that idea, or start another journey.',
    };
  }

  const missCount = countMisconceptionsForConcept(misconceptions, concept);

  if (missCount >= REMEDIAL_MISCONCEPTION_THRESHOLD || remedialAlreadyScheduled) {
    return {
      type: 'remedial',
      concept,
      message: `We'll take an extra beat to revisit ${concept} before moving on.`,
    };
  }

  return {
    type: 'revisit',
    concept,
    message: 'That idea will come back in the next scene.',
  };
}

export function getScaffoldAdjustmentNotice(adjustment) {
  if (!adjustment?.action) return null;

  if (adjustment.action === 'insert' && Array.isArray(adjustment.beats) && adjustment.beats.length > 0) {
    const title = adjustment.beats[0]?.title || adjustment.beats[0]?.concept;
    return title
      ? `The path now includes an extra beat: ${title}.`
      : 'The story path was extended with an extra practice beat.';
  }

  if (adjustment.action === 'annotate') {
    return 'The upcoming beat was tuned to match what you need.';
  }

  if (adjustment.action === 'skip') {
    return 'Skipping ahead — you already showed you know the next idea.';
  }

  return null;
}
