import { useTheme } from '../contexts/ThemeContext';

const Toolbar = ({ onOpenSettings }) => {
  const { mode, toggleMode } = useTheme();

  return (
    <div className="scene__toolbar">
      <button
        onClick={toggleMode}
        className="p-2 rounded-lg transition-all hover:scale-110"
        style={{
          backgroundColor: 'var(--color-accent-soft)',
          color: 'var(--color-text)',
          border: '2px solid var(--color-accent)',
        }}
        aria-label={`Switch to ${mode === 'day' ? 'night' : 'day'} mode`}
        title={`Switch to ${mode === 'day' ? 'night' : 'day'} mode`}
      >
        {mode === 'day' ? '🌙' : '☀️'}
      </button>
      <button
        onClick={onOpenSettings}
        className="p-2 rounded-lg transition-all hover:scale-110"
        style={{
          backgroundColor: 'var(--color-accent-soft)',
          color: 'var(--color-text)',
          border: '2px solid var(--color-accent)',
        }}
        aria-label="Open settings"
        title="Settings"
      >
        ⚙️
      </button>
    </div>
  );
};

export default Toolbar;
