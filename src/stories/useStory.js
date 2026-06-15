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

  const syncState = useCallback(() => {
    setPhase(engine.getPhase());
    setBeatIndex(engine.beatCursor);
    setTotalBeats(engine.getTotalBeats());
    setLearnerProfile({ ...engine.learnerProfile });
    setStorySoFar(engine.getStorySoFar());
  }, [engine]);

  // Called after intake quiz completes — generates the scaffold then loads beat 0
  const initScaffold = useCallback(async ({ subject, genre, mode, level, answers }) => {
    setError(null);
    setIsLoading(true);
    engine.setPhase(STORY_PHASES.SCAFFOLD);
    engine.setLevel(level || 'beginner');
    syncState();

    try {
      const scaffoldData = await generateScaffold({ subject, genre, mode, level, answers });
      engine.initFromScaffold(scaffoldData);
      setScaffold(scaffoldData);
      syncState();

      const ctx = engine.getPromptContext();
      const beatData = await generateBeat({
        scaffold: scaffoldData,
        currentBeat: ctx.currentBeat,
        learnerProfile: ctx.learnerProfile,
        storySoFar: ctx.storySoFar,
        genre,
        mode,
        beatIndex: ctx.beatIndex,
        totalBeats: engine.getTotalBeats(),
        previousNarrativeOpening: undefined,
      });

      setCurrentBeatData(beatData);
      engine.setPhase(STORY_PHASES.NARRATION);
      syncState();
    } catch (err) {
      setError(err?.message || 'Failed to generate scaffold');
      engine.setPhase(STORY_PHASES.INTAKE);
      syncState();
    } finally {
      setIsLoading(false);
    }
  }, [engine, syncState]);

  // Load the current beat's content from the API
  const loadBeat = useCallback(async () => {
    if (!scaffold) return;
    setError(null);
    setIsLoading(true);

    try {
      const ctx = engine.getPromptContext();
      const beatData = await generateBeat({
        scaffold,
        currentBeat: ctx.currentBeat,
        learnerProfile: ctx.learnerProfile,
        storySoFar: ctx.storySoFar,
        genre: scaffold.theme?.genre,
        mode: scaffold.theme?.mode,
        beatIndex: ctx.beatIndex,
        totalBeats: engine.getTotalBeats(),
        previousNarrativeOpening: extractPreviousNarrativeOpening(currentBeatData?.narrative),
      });

      setCurrentBeatData(beatData);
      engine.setPhase(STORY_PHASES.NARRATION);
      syncState();
    } catch (err) {
      setError(err?.message || 'Failed to generate beat');
    } finally {
      setIsLoading(false);
    }
  }, [engine, scaffold, syncState, currentBeatData]);

  // Called when the user answers a checkpoint
  const submitCheckpoint = useCallback(({ selectedIndex, correct }) => {
    engine.recordCheckpoint({
      selectedIndex,
      correct,
      beatSummary: currentBeatData?.beatSummary || '',
      narrative: currentBeatData?.narrative || '',
      checkpoint: currentBeatData?.checkpoint,
    });

    if (currentBeatData?.scaffoldAdjustment) {
      engine.adjustScaffold(currentBeatData.scaffoldAdjustment);
      setScaffold({ ...engine.scaffold });
      setTotalBeats(engine.getTotalBeats());
    }

    engine.setPhase(STORY_PHASES.CHECKPOINT);
    syncState();
  }, [engine, currentBeatData, syncState]);

  // Called after checkpoint feedback — advance to next beat or complete
  const continueStory = useCallback(async () => {
    const hasMore = engine.advanceBeat();
    syncState();

    if (!hasMore) {
      setCurrentBeatData(null);
      return;
    }

    await loadBeat();
  }, [engine, syncState, loadBeat]);

  const reset = useCallback(() => {
    engine.reset();
    setScaffold(null);
    setCurrentBeatData(null);
    setError(null);
    setIsLoading(false);
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
    error,
    initScaffold,
    loadBeat,
    submitCheckpoint,
    continueStory,
    reset,
  };
};
