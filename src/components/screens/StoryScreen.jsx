import { filterUnusedDirections } from '../../../lib/steerDirections.js';
import StoryBeat from '../../stories/StoryBeat';
import SceneShell from '../SceneShell';
import Toolbar from '../Toolbar';

export default function StoryScreen({
  scaffold,
  currentBeatData,
  beatIndex,
  totalBeats,
  storySoFar,
  learnerProfile,
  isLoading,
  loadingMessage,
  error,
  adaptationNotice,
  checkpointAnswered,
  onAnswer,
  onContinue,
  onSteer,
  onOpenSettings,
  toolbarAuthProps,
  settings,
}) {
  const taughtForSteer = [
    ...(learnerProfile?.confirmedUnderstandings || []),
    ...storySoFar.map(b => b.concept).filter(Boolean),
    scaffold?.beats?.[beatIndex]?.concept,
    currentBeatData?.concept,
  ].filter(Boolean);
  const steerDirections = beatIndex + 1 < totalBeats
    ? filterUnusedDirections(currentBeatData?.nextDirections, taughtForSteer)
    : [];
  const showSteer = steerDirections.length >= 2;

  return (
    <SceneShell contentClassName="scene__content scene__content--story" settings={settings}>
      <div className="mb-6 text-center sm:text-left story-chrome">
        <Toolbar onOpenSettings={onOpenSettings} {...toolbarAuthProps} />
        <h2 className="text-2xl font-bold genre-title mb-2">Your Story</h2>
        <div className="flex items-center gap-3 mb-1">
          <p className="ui-meta">
            Beat {beatIndex + 1} of {totalBeats}
          </p>
          {scaffold?.beats?.[beatIndex]?.isRemedial && (
            <span className="story-remedial-badge">Practice beat</span>
          )}
        </div>
        {totalBeats > 0 && (
          <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${((beatIndex + (checkpointAnswered ? 1 : 0)) / totalBeats) * 100}%`,
                backgroundColor: 'var(--color-accent)',
              }}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="genre-card p-4 rounded-lg mb-4 space-y-3">
          <p className="text-sm" style={{ color: 'var(--color-accent)' }}>{error}</p>
        </div>
      )}

      {adaptationNotice?.type === 'path' && (
        <p className="story-adaptation-notice story-adaptation-notice--path mb-4" role="status">
          {adaptationNotice.message}
        </p>
      )}

      <StoryBeat
        key={beatIndex}
        narrative={currentBeatData?.narrative}
        checkpoint={currentBeatData?.checkpoint}
        nextDirections={steerDirections}
        onAnswer={onAnswer}
        onSteer={onSteer}
        isLoading={isLoading}
        loadingMessage={loadingMessage}
        adaptationNotice={adaptationNotice?.type !== 'path' ? adaptationNotice : null}
      />

      {checkpointAnswered && !showSteer && (
        <div className="mt-4 story-chrome">
          <button
            onClick={onContinue}
            disabled={isLoading}
            className="w-full genre-button ui-btn px-4 py-3 rounded-lg"
          >
            {isLoading ? 'Loading next beat...' : (beatIndex + 1 >= totalBeats ? 'Finish Journey' : 'Continue')}
          </button>
        </div>
      )}

      {storySoFar.length > 0 && (
        <details className="mt-6 genre-card p-4 rounded-lg story-chrome story-recap">
          <summary className="ui-meta font-medium cursor-pointer">
            Story so far ({storySoFar.length} beat{storySoFar.length !== 1 ? 's' : ''})
          </summary>
          <ul className="mt-2 space-y-1 ui-meta">
            {storySoFar.map((beat, i) => (
              <li key={i}>
                <span className="font-medium">{beat.beatTitle}:</span> {beat.summary}{' '}
                {beat.correct ? '✓' : '✗'}
              </li>
            ))}
          </ul>
        </details>
      )}
    </SceneShell>
  );
}
