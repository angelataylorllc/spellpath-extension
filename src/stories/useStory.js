import { useState, useCallback, useRef } from 'react';
import { StoryEngine, STORY_PHASES } from './engine';
import { generateScaffold, generateBeat } from '../services/contentApi';

export { STORY_PHASES };

/** First paragraph of prior beat narrative — sent to API to reduce repeated openings. */
function extractPreviousNarrativeOpening(narrative) {
  if (!narrative || typeof narrative !== 'string') return undefined;
  const first = narrative.trim().split(/\n\n+/)[0] || '';
  const s = first.trim().slice(0, 480);
  return s.length ? s : undefined;
}

function applyLoadedBeatSideEffects(engine, beatData, setScaffold) {
  if (!beatData?.scaffoldAdjustment) {
    return { adjustmentNotice: null };
  }

  const changed = engine.applyLoadedBeatAdjustment(beatData.scaffoldAdjustment);
  if (changed) {
    setScaffold({ ...engine.scaffold });
  }

  return {
    adjustmentNotice: engine.getScaffoldAdjustmentNotice(beatData.scaffoldAdjustment),
  };
}

export const useStory = () => {
  const engineRef = useRef(new StoryEngine());
  const engine = engineRef.current;

  const [phase, setPhase] = useState(engine.getPhase());
  const [scaffold, setScaffold] = useState(null);
  const [currentBeatData, setCurrentBeatData] = useState(null);
  const [learnerProfile, setLearnerProfile] = useState({ ...engine.learnerProfile });
  const [beatIndex, setBeatIndex] = useState(0);
  const [totalBeats, setTotalBeats] = useState(0);
  const [storySoFar, setStorySoFar] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [adaptationNotice, setAdaptationNotice] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState(null);

  const syncState = useCallback(() => {
    setPhase(engine.getPhase());
    setBeatIndex(engine.beatCursor);
    setTotalBeats(engine.getTotalBeats());
    setLearnerProfile({ ...engine.learnerProfile });
    setStorySoFar(engine.getStorySoFar());
  }, [engine]);

  // Called after intake quiz completes — generates the scaffold then loads beat 0
  const initScaffold = useCallback(async ({
    subject,
    genre,
    mode,
    level,
    age,
    motivation,
    learningGoals,
    learningFocus,
    answers,
    topicCategory,
    authorStyle,
  }) => {
    setError(null);
    setAdaptationNotice(null);
    setLoadingMessage(null);
    setIsLoading(true);
    engine.setPhase(STORY_PHASES.SCAFFOLD);
    engine.setLevel(level || 'beginner');
    engine.setLearnerContext({ age, motivation, learningGoals, learningFocus });
    syncState();

    try {
      const scaffoldData = await generateScaffold({
        subject,
        genre,
        mode,
        level,
        age,
        motivation,
        learningGoals,
        learningFocus,
        topicCategory: topicCategory || 'standard',
        authorStyle: authorStyle || '',
        answers,
      });
      engine.initFromScaffold(scaffoldData);
      setScaffold(scaffoldData);
      syncState();

      const ctx = engine.getPromptContext();
      const beatData = await generateBeat({
        scaffold: scaffoldData,
        currentBeat: ctx.currentBeat,
        learnerProfile: ctx.learnerProfile,
        storySoFar: ctx.storySoFar,
        recentCheckpoints: ctx.recentCheckpoints,
        learnerDirection: ctx.learnerDirection,
        steerOverride: ctx.steerOverride,
        genre,
        mode,
        beatIndex: ctx.beatIndex,
        totalBeats: engine.getTotalBeats(),
        previousNarrativeOpening: undefined,
      });

      applyLoadedBeatSideEffects(engine, beatData, setScaffold);
      setCurrentBeatData(beatData);
      engine.setPhase(STORY_PHASES.NARRATION);
      syncState();
    } catch (err) {
      const message = err?.message || 'Failed to generate story';
      setError(message);
      engine.setPhase(STORY_PHASES.INTAKE);
      syncState();
      throw err;
    } finally {
      setIsLoading(false);
      setLoadingMessage(null);
    }
  }, [engine, syncState]);

  // Load the current beat's content from the API
  const loadBeat = useCallback(async ({ loadingHint } = {}) => {
    if (!scaffold) return;
    setError(null);
    setIsLoading(true);
    if (loadingHint) setLoadingMessage(loadingHint);

    try {
      const ctx = engine.getPromptContext();
      const beatData = await generateBeat({
        scaffold: engine.scaffold || scaffold,
        currentBeat: ctx.currentBeat,
        learnerProfile: ctx.learnerProfile,
        storySoFar: ctx.storySoFar,
        recentCheckpoints: ctx.recentCheckpoints,
        learnerDirection: ctx.learnerDirection,
        steerOverride: ctx.steerOverride,
        genre: scaffold.theme?.genre,
        mode: scaffold.theme?.mode,
        beatIndex: ctx.beatIndex,
        totalBeats: engine.getTotalBeats(),
        previousNarrativeOpening: extractPreviousNarrativeOpening(currentBeatData?.narrative),
      });

      const { adjustmentNotice } = applyLoadedBeatSideEffects(engine, beatData, setScaffold);
      setCurrentBeatData(beatData);
      engine.setPhase(STORY_PHASES.NARRATION);
      syncState();

      if (adjustmentNotice) {
        setAdaptationNotice({
          type: 'path',
          concept: ctx.currentBeat?.concept || '',
          message: adjustmentNotice,
        });
      }
    } catch (err) {
      setError(err?.message || 'Failed to generate beat');
    } finally {
      setIsLoading(false);
      setLoadingMessage(null);
    }
  }, [engine, scaffold, syncState, currentBeatData]);

  // Called when the user answers a checkpoint
  const submitCheckpoint = useCallback(({ selectedIndex, correct }) => {
    const concept = engine.getCurrentBeat()?.concept || '';

    engine.recordCheckpoint({
      selectedIndex,
      correct,
      beatSummary: currentBeatData?.beatSummary || '',
      narrative: currentBeatData?.narrative || '',
      checkpoint: currentBeatData?.checkpoint,
      unresolvedHook: currentBeatData?.unresolvedHook || '',
      recapTitle: currentBeatData?.recapTitle || '',
    });

    setAdaptationNotice(engine.getAdaptationNotice({ correct, concept }));
    engine.setPhase(STORY_PHASES.CHECKPOINT);
    syncState();
  }, [engine, currentBeatData, syncState]);

  // Called after checkpoint feedback — optional steer, then next beat or complete
  const continueStory = useCallback(async (direction = null) => {
    setAdaptationNotice(null);
    engine.activeSteer = null;
    engine.pendingSteer = null;
    if (direction) engine.setSteer(direction);

    const hasMore = engine.advanceBeat();
    syncState();

    if (!hasMore) {
      setCurrentBeatData(null);
      return;
    }

    const remedial = engine.maybeInsertRemedialBeat();
    if (remedial) {
      engine.applyPendingSteerToBeat(engine.beatCursor + 1);
      setScaffold({ ...engine.scaffold });
      syncState();
    } else {
      engine.applyPendingSteerToBeat(engine.beatCursor);
      setScaffold({ ...engine.scaffold });
    }

    const loadingHint = remedial
      ? `Crafting a practice beat on ${remedial.concept}…`
      : direction?.label
        ? `Following ${direction.speaker ? `${direction.speaker}: ` : ''}${direction.label}…`
        : null;

    await loadBeat({ loadingHint });
    engine.activeSteer = null;
  }, [engine, syncState, loadBeat]);

  const reset = useCallback(() => {
    engine.reset();
    setScaffold(null);
    setCurrentBeatData(null);
    setError(null);
    setIsLoading(false);
    setAdaptationNotice(null);
    setLoadingMessage(null);
    syncState();
  }, [engine, syncState]);

  return {
    phase,
    scaffold,
    currentBeatData,
    learnerProfile,
    beatIndex,
    totalBeats,
    storySoFar,
    isLoading,
    loadingMessage,
    error,
    adaptationNotice,
    initScaffold,
    loadBeat,
    submitCheckpoint,
    continueStory,
    reset,
  };
};
