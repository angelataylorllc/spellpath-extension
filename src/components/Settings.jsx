export const Settings = ({ onClose }) => {

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="rounded-xl shadow-2xl max-w-md w-full p-6 space-y-6 border"
        style={{
          background: 'color-mix(in srgb, var(--color-bg-alt) 82%, var(--color-bg) 18%)',
          borderColor: 'var(--color-accent-soft)',
          boxShadow: 'var(--panel-shadow)',
          color: 'var(--color-text)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none transition-opacity hover:opacity-80"
            style={{ color: 'var(--color-text)' }}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 text-left" style={{ color: 'var(--color-text)' }}>
          <p className="text-sm opacity-80">
            SpellPath turns any topic into an interactive, story-driven learning path. Pick a subject,
            choose a vibe, and we’ll generate quizzes and narratives that adapt as you go.
          </p>
          <p className="text-sm opacity-80">
            Theme colors and day/night are controlled from the main screen. More personalization,
            audio/FX controls, and accessibility tweaks will land here soon.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full genre-button ui-btn py-2 px-4 rounded-lg font-medium transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};
