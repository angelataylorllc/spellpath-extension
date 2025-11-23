import { useTheme } from '../contexts/ThemeContext';

export const Settings = ({ onClose }) => {
  const { mode, toggleMode, theme, setTheme, themes } = useTheme();

  const themeLabels = {
    adventure: '🗺️ Adventure',
    mystery: '🔍 Mystery',
    scifi: '🚀 Sci-Fi',
    fantasy: '🧙‍♂️ Fantasy',
    horror: '👻 Horror',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        {/* Day/Night Toggle */}
        <div className="space-y-3">
          <label className="block text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            Appearance
          </label>
          <div className="flex items-center justify-between p-4 rounded-lg border" style={{ 
            backgroundColor: 'var(--color-bg-alt)', 
            borderColor: 'var(--color-accent-soft)' 
          }}>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              {mode === 'day' ? '☀️ Day Mode' : '🌙 Night Mode'}
            </span>
            <button
              onClick={toggleMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                mode === 'night' ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              aria-label="Toggle day/night mode"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  mode === 'night' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Theme Selector */}
        <div className="space-y-3">
          <label className="block text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            Theme
          </label>
          <div className="grid grid-cols-1 gap-2">
            {themes.map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  theme === t
                    ? 'border-opacity-100 shadow-md'
                    : 'border-opacity-50 hover:border-opacity-75'
                }`}
                style={{
                  backgroundColor: theme === t ? 'var(--color-accent-soft)' : 'var(--color-bg-alt)',
                  borderColor: 'var(--color-accent)',
                  color: 'var(--color-text)',
                }}
              >
                <span className="font-medium">{themeLabels[t] || t}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 px-4 rounded-lg font-medium transition-colors"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-bg)',
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
};

