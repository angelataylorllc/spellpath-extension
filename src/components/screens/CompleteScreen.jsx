import SceneShell from '../SceneShell';
import Toolbar from '../Toolbar';

export default function CompleteScreen({
  subject,
  storySoFar,
  onDownloadJson,
  onDownloadPdf,
  onStartOver,
  onOpenSettings,
  toolbarAuthProps,
  settings,
}) {
  return (
    <SceneShell settings={settings}>
      <div className="mb-6 text-center sm:text-left">
        <Toolbar onOpenSettings={onOpenSettings} {...toolbarAuthProps} />
      </div>

      <div className="genre-card p-6 rounded-lg text-center space-y-4">
        <h2 className="text-2xl font-bold genre-title">Journey Complete!</h2>
        <p className="ui-subtitle">
          You explored <span className="font-medium">{subject}</span> across {storySoFar.length} beats.
        </p>

        {storySoFar.length > 0 && (
          <div className="text-left space-y-2">
            <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>Recap</p>
            <ul className="space-y-1 text-sm opacity-80">
              {storySoFar.map((beat, i) => (
                <li key={i}>
                  <span className="font-medium">{beat.beatTitle}:</span> {beat.summary}{' '}
                  {beat.correct ? '✓' : '✗'}
                </li>
              ))}
            </ul>
          </div>
        )}

        {storySoFar.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onDownloadJson}
              className="flex-1 genre-button ui-btn px-4 py-3 rounded-lg"
            >
              Download JSON
            </button>
            <button
              type="button"
              onClick={onDownloadPdf}
              className="flex-1 genre-button ui-btn px-4 py-3 rounded-lg"
            >
              Download PDF
            </button>
          </div>
        )}

        <button
          onClick={onStartOver}
          className="w-full genre-button ui-btn px-4 py-3 rounded-lg"
        >
          Start New Adventure
        </button>
      </div>
    </SceneShell>
  );
}
