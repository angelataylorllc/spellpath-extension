// Contract references:
// docs/contracts/02-scaffold.md  – scaffold structure
// docs/contracts/03-narration.md – beat delivery
// docs/contracts/04-checkpoints.md – learner assessment
// docs/contracts/05-adaptation.md – scaffold adjustment
//
// This engine manages phase progression, scaffold state, beat cursor,
// and the learner profile. It does NOT generate content or call APIs.

import { parseNarrativeBlocks } from './parseNarrativeBlocks';
import { normalizeMotivation } from '../../lib/motivation.js';
import { normalizeLearningFocus } from '../../lib/learningFocus.js';
import { normalizeAge } from '../../lib/ageBand.js';
import {
  REMEDIAL_MISCONCEPTION_THRESHOLD,
  buildRemedialBeat,
  countMisconceptionsForConcept,
  getAdaptationNotice,
  getScaffoldAdjustmentNotice,
} from './adaptation';

export const STORY_PHASES = {
  INTAKE: 'intake',
  SCAFFOLD: 'scaffold',
  NARRATION: 'narration',
  CHECKPOINT: 'checkpoint',
  ADAPTATION: 'adaptation',
  COMPLETE: 'complete',
};

export class StoryEngine {
  constructor() {
    this.scaffold = null;
    this.beatCursor = 0;
    this.currentPhase = STORY_PHASES.INTAKE;

    // Accumulated from checkpoint responses
    this.learnerProfile = {
      level: 'beginner',
      age: null,
      motivation: null,
      learningGoals: null,
      learningFocus: null,
      confirmedUnderstandings: [],
      misconceptions: [],
    };

    // Completed beat summaries + checkpoint results
    this.completedBeats = [];

    /** Concepts that already received an engine-inserted remedial beat */
    this.remedialInsertedFor = [];

    /** Direction chosen at the last fork; applied to the upcoming non-remedial beat */
    this.pendingSteer = null;
    this.activeSteer = null;
  }

  // --- Scaffold lifecycle ---

  initFromScaffold(scaffoldData) {
    this.scaffold = scaffoldData;
    this.beatCursor = 0;
    this.completedBeats = [];
    this.remedialInsertedFor = [];
    this.pendingSteer = null;
    this.activeSteer = null;
    this.currentPhase = STORY_PHASES.NARRATION;
  }

  getCurrentBeat() {
    if (!this.scaffold?.beats) return null;
    return this.scaffold.beats[this.beatCursor] ?? null;
  }

  getTotalBeats() {
    return this.scaffold?.beats?.length ?? 0;
  }

  isComplete() {
    return this.currentPhase === STORY_PHASES.COMPLETE;
  }

  // --- Checkpoint handling ---

  recordCheckpoint({ selectedIndex, correct, beatSummary, narrative, checkpoint, unresolvedHook, recapTitle }) {
    const beat = this.getCurrentBeat();
    const options = checkpoint?.options || [];
    const narrativeText = narrative || '';

    this.completedBeats.push({
      beatId: beat?.id ?? `beat_${this.beatCursor}`,
      beatTitle: (recapTitle || beat?.title || '').trim().slice(0, 48),
      concept: beat?.concept ?? '',
      summary: beatSummary ?? '',
      unresolvedHook: unresolvedHook || '',
      chosenDirection: null,
      narrative: narrativeText,
      narrativeBlocks: narrativeText ? parseNarrativeBlocks(narrativeText) : [],
      checkpointRecord: checkpoint
        ? {
            question: checkpoint.question,
            options: options.map(o => ({
              label: o.label ?? o.text ?? o.option ?? 'Option',
              correct: o.correct,
            })),
            hint: checkpoint.hint || null,
            feedbackCorrect: checkpoint.feedbackCorrect || null,
            feedbackIncorrect: checkpoint.feedbackIncorrect || null,
            selectedIndex,
            selectedLabel: options[selectedIndex]?.label ?? null,
            correct,
          }
        : null,
      correct,
      selectedIndex,
    });

    if (correct) {
      const concept = beat?.concept ?? `beat_${this.beatCursor}`;
      if (!this.learnerProfile.confirmedUnderstandings.includes(concept)) {
        this.learnerProfile.confirmedUnderstandings.push(concept);
      }
    } else {
      const selectedLabel = options[selectedIndex]?.label ?? null;
      this.learnerProfile.misconceptions.push({
        concept: beat?.concept ?? `beat_${this.beatCursor}`,
        beatIndex: this.beatCursor,
        wrongAnswer: selectedLabel,
      });
    }

    this.currentPhase = STORY_PHASES.ADAPTATION;
  }

  /**
   * Remember the learner's "which way?" pick. Applied to the next non-remedial beat.
   */
  setSteer(direction) {
    if (!direction || typeof direction !== 'object') return;
    this.pendingSteer = {
      id: direction.id || '',
      label: direction.label || '',
      concept: direction.concept || '',
      speaker: direction.speaker || '',
      isMainThread: Boolean(direction.isMainThread),
    };
    const last = this.completedBeats[this.completedBeats.length - 1];
    if (last) last.chosenDirection = this.pendingSteer.label;
  }

  applyPendingSteerToBeat(index) {
    const dir = this.pendingSteer;
    if (!dir || !this.scaffold?.beats?.[index]) return false;
    const beat = this.scaffold.beats[index];
    if (beat.isRemedial) return false;

    const speakerLead = dir.speaker ? `${dir.speaker} leads. ` : '';
    const teach = dir.concept || beat.concept;
    beat.concept = teach;
    if (dir.label) beat.title = String(dir.label).slice(0, 48);
    beat.checkpointFocus =
      `Learner chose "${dir.label}". Test ONLY: ${teach}. ` +
      'Do not test the previous beat\'s leftover pitch.';
    beat.narrativeHint =
      `${speakerLead}OPEN on this path immediately. Previous closer was a menu, not this lesson. ` +
      `Follow: ${dir.label || teach}. Teach: ${teach}. Same cast and throughLine.`;
    if (!dir.isMainThread && beat.flexibility === 'rigid') {
      beat.flexibility = 'soft';
    }
    this.activeSteer = dir;
    this.pendingSteer = null;
    return true;
  }

  // --- Beat progression ---

  advanceBeat() {
    this.beatCursor += 1;
    if (this.beatCursor >= this.getTotalBeats()) {
      this.currentPhase = STORY_PHASES.COMPLETE;
      return false;
    }
    this.currentPhase = STORY_PHASES.NARRATION;
    return true;
  }

  // --- Scaffold adjustment ---

  adjustScaffold(adjustment) {
    if (!adjustment || !this.scaffold?.beats) return false;

    const { action, beats: newBeats, annotations } = adjustment;
    let changed = false;

    if (action === 'insert' && Array.isArray(newBeats) && newBeats.length > 0) {
      this.scaffold.beats.splice(this.beatCursor + 1, 0, ...newBeats);
      changed = true;
    }

    if (action === 'annotate' && annotations) {
      const beat = this.scaffold.beats[this.beatCursor + 1];
      if (beat) {
        Object.assign(beat, annotations);
        changed = true;
      }
    }

    if (action === 'skip') {
      const nextBeat = this.scaffold.beats[this.beatCursor + 1];
      if (nextBeat?.flexibility === 'skippable') {
        this.scaffold.beats.splice(this.beatCursor + 1, 1);
        changed = true;
      }
    }

    return changed;
  }

  /** Apply scaffoldAdjustment from a loaded beat (inserts after the current beat). */
  applyLoadedBeatAdjustment(adjustment) {
    return this.adjustScaffold(adjustment);
  }

  getScaffoldAdjustmentNotice(adjustment) {
    return getScaffoldAdjustmentNotice(adjustment);
  }

  /** After 2+ wrong answers on the same concept, insert a remedial beat at the cursor. */
  maybeInsertRemedialBeat() {
    if (!this.scaffold?.beats?.length) return null;

    const misconceptions = this.learnerProfile.misconceptions;
    if (!misconceptions.length) return null;

    const last = misconceptions[misconceptions.length - 1];
    const concept = last.concept;
    if (!concept || this.remedialInsertedFor.includes(concept)) return null;

    const missCount = countMisconceptionsForConcept(misconceptions, concept);
    if (missCount < REMEDIAL_MISCONCEPTION_THRESHOLD) return null;

    const remedial = buildRemedialBeat({
      concept,
      wrongAnswer: last.wrongAnswer,
      beatIndex: this.beatCursor,
    });

    this.scaffold.beats.splice(this.beatCursor, 0, remedial);
    this.remedialInsertedFor.push(concept);
    return remedial;
  }

  willScheduleRemedialBeat(concept) {
    if (!concept || this.remedialInsertedFor.includes(concept)) return false;
    const missCount = countMisconceptionsForConcept(this.learnerProfile.misconceptions, concept);
    return missCount >= REMEDIAL_MISCONCEPTION_THRESHOLD;
  }

  getAdaptationNotice({ correct, concept }) {
    return getAdaptationNotice({
      correct,
      concept,
      misconceptions: this.learnerProfile.misconceptions,
      remedialAlreadyScheduled: this.willScheduleRemedialBeat(concept),
      isLastBeat: this.beatCursor + 1 >= this.getTotalBeats(),
    });
  }

  // --- Prompt context ---

  getPromptContext() {
    const last = this.completedBeats[this.completedBeats.length - 1];
    const steered = Boolean(this.activeSteer);
    return {
      scaffold: this.scaffold,
      currentBeat: this.getCurrentBeat(),
      beatIndex: this.beatCursor,
      learnerProfile: { ...this.learnerProfile },
      storySoFar: this.completedBeats.map((b, i, arr) => ({
        summary: b.summary,
        hook: b.unresolvedHook || '',
        concept: b.concept,
        chosenDirection: b.chosenDirection || null,
        ...(steered && i === arr.length - 1
          ? {
              note:
                'Last paragraph was a choice menu only. Learner picked ' +
                `"${this.activeSteer.label}". Do not teach the unchosen pitches.`,
            }
          : {}),
      })),
      recentCheckpoints: this.completedBeats.map(b => ({
        beatTitle: b.beatTitle,
        concept: b.concept,
        correct: b.correct,
        selectedLabel: b.checkpointRecord?.selectedLabel ?? null,
        question: b.checkpointRecord?.question ?? null,
      })),
      lastBeatHook: last?.unresolvedHook || '',
      learnerDirection: this.activeSteer,
      steerOverride: steered,
      previousCloserWasMenu: steered,
    };
  }

  getStorySoFar() {
    return [...this.completedBeats];
  }

  // --- Phase ---

  getPhase() {
    return this.currentPhase;
  }

  setPhase(phase) {
    this.currentPhase = phase;
  }

  // --- Lifecycle ---

  reset() {
    this.scaffold = null;
    this.beatCursor = 0;
    this.currentPhase = STORY_PHASES.INTAKE;
    this.learnerProfile = {
      level: 'beginner',
      age: null,
      motivation: null,
      learningGoals: null,
      learningFocus: null,
      confirmedUnderstandings: [],
      misconceptions: [],
    };
    this.completedBeats = [];
    this.remedialInsertedFor = [];
    this.pendingSteer = null;
    this.activeSteer = null;
  }

  setLevel(level) {
    this.learnerProfile.level = level;
  }

  setLearnerContext({ age, motivation, learningGoals, learningFocus }) {
    if (age) this.learnerProfile.age = normalizeAge(age);
    if (motivation) this.learnerProfile.motivation = normalizeMotivation(motivation);
    if (learningGoals !== undefined) {
      this.learnerProfile.learningGoals = learningGoals?.trim() || null;
    }
    if (learningFocus) this.learnerProfile.learningFocus = normalizeLearningFocus(learningFocus);
  }
}
