import SceneShell from '../SceneShell';
import Toolbar from '../Toolbar';

export default function ScaffoldingScreen({
  subject,
  error,
  isLoading,
  onRetry,
  onBack,
  onOpenSettings,
  toolbarAuthProps,
  settings,
}) {
  return (
    <SceneShell settings={settings}>
      <div className="mb-6 text-center sm:text-left">
        <Toolbar onOpenSettings={onOpenSettings} {...toolbarAuthProps} />
      </div>
      <div className="genre-card story-loading p-8 rounded-lg text-center space-y-4">
        {error && !isLoading ? (
          <>
            <h2 className="text-2xl font-bold genre-title">Couldn&apos;t Build Your Path</h2>
            <p className="ui-subtitle text-left" style={{ color: 'var(--color-accent)' }}>
              {error}
            </p>
            <p className="text-sm opacity-80 text-left">
              Check that <code className="text-xs">npm run api</code> is running, your active
              provider key in Settings is valid, and try again.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={onRetry}
                className="flex-1 genre-button ui-btn px-4 py-3 rounded-lg"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={onBack}
                className="flex-1 genre-button ui-btn px-4 py-3 rounded-lg opacity-90"
              >
                Back to start
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold genre-title">Building Your Path</h2>
            <p className="ui-subtitle">
              Crafting a personalized learning journey for{' '}
              <span className="font-medium">{subject}</span>...
            </p>
            <div className="story-loading__pulse" aria-hidden="true" />
          </>
        )}
      </div>
    </SceneShell>
  );
}
