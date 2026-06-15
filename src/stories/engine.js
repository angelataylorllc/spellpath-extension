// Contract references:
// docs/contracts/02-scaffold.md  – scaffold structure
// docs/contracts/03-narration.md – beat delivery
// docs/contracts/04-checkpoints.md – learner assessment
// docs/contracts/05-adaptation.md – scaffold adjustment
//
// This engine manages phase progression, scaffold state, beat cursor,
// and the learner profile. It does NOT generate content or call APIs.

import { parseNarrativeBlocks } from './parseNarrativeBlocks';

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
      confirmedUnderstandings: [],
      misconceptions: [],
    };

    // Completed beat summaries + checkpoint results
    this.completedBeats = [];
  }

  // --- Scaffold lifecycle ---

  initFromScaffold(scaffoldData) {
    this.scaffold = scaffoldData;
    this.beatCursor = 0;
    this.completedBeats = [];
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

  recordCheckpoint({ selectedIndex, correct, beatSummary, narrative, checkpoint }) {
    const beat = this.getCurrentBeat();
    const options = checkpoint?.options || [];
    const narrativeText = narrative || '';

    this.completedBeats.push({
      beatId: beat?.id ?? `beat_${this.beatCursor}`,
      beatTitle: beat?.title ?? '',
      concept: beat?.concept ?? '',
      summary: beatSummary ?? '',
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
            selectedIndex,
            selectedLabel: options[selectedIndex]?.label ?? null,
            correct,
          }
        : null,
      correct,
      selectedIndex,
    });

    if (correct) {
      this.learnerProfile.confirmedUnderstandings.push(
        beat?.concept ?? `beat_${this.beatCursor}`
      );
    } else {
      this.learnerProfile.misconceptions.push({
        concept: beat?.concept ?? `beat_${this.beatCursor}`,
        beatIndex: this.beatCursor,
      });
    }

    this.currentPhase = STORY_PHASES.ADAPTATION;
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
    if (!adjustment || !this.scaffold?.beats) return;

    const { action, beats: newBeats, annotations } = adjustment;

    if (action === 'insert' && Array.isArray(newBeats)) {
      this.scaffold.beats.splice(this.beatCursor + 1, 0, ...newBeats);
    }

    if (action === 'annotate' && annotations) {
      const beat = this.scaffold.beats[this.beatCursor + 1];
      if (beat) Object.assign(beat, annotations);
    }

    if (action === 'skip') {
      const nextBeat = this.scaffold.beats[this.beatCursor + 1];
      if (nextBeat?.flexibility === 'skippable') {
        this.scaffold.beats.splice(this.beatCursor + 1, 1);
      }
    }
  }

  // --- Prompt context ---

  getPromptContext() {
    return {
      scaffold: this.scaffold,
      currentBeat: this.getCurrentBeat(),
      beatIndex: this.beatCursor,
      learnerProfile: { ...this.learnerProfile },
      storySoFar: this.completedBeats.map(b => b.summary),
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
      confirmedUnderstandings: [],
      misconceptions: [],
    };
    this.completedBeats = [];
  }

  setLevel(level) {
    this.learnerProfile.level = level;
  }
}
