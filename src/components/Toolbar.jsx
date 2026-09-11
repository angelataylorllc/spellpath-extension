import { useTheme } from '../contexts/ThemeContext';

const Toolbar = ({ onOpenSettings, onSignOut, user, leading }) => {
  const { mode, toggleMode } = useTheme();

  return (
    <div className="scene__toolbar">
      {leading ? <div className="scene__toolbar-leading">{leading}</div> : null}
      <div className={`scene__toolbar-actions${leading ? '' : ' scene__toolbar-actions--end'}`}>
        {user?.email && (
          <span className="ui-meta text-sm hidden sm:inline" title={user.email}>
            {user.name || user.email}
          </span>
        )}
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="p-2 rounded-lg transition-all hover:scale-110 text-sm"
            style={{
              backgroundColor: 'var(--color-accent-soft)',
              color: 'var(--color-text)',
              border: '2px solid var(--color-accent)',
            }}
            aria-label="Sign out"
            title="Sign out"
          >
            ↩
          </button>
        )}
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
    </div>
  );
};

export default Toolbar;
