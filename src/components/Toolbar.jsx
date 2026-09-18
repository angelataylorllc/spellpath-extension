import { useTheme } from '../contexts/ThemeContext';

function ToolbarIcon({ children }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

function SignOutIcon() {
  return (
    <ToolbarIcon>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
      />
    </ToolbarIcon>
  );
}

function MoonIcon() {
  return (
    <ToolbarIcon>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z"
      />
    </ToolbarIcon>
  );
}

function SunIcon() {
  return (
    <ToolbarIcon>
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        d="M12 3v1.5M12 19.5V21M4.2 4.2l1.1 1.1M18.7 18.7l1.1 1.1M3 12h1.5M19.5 12H21M4.2 19.8l1.1-1.1M18.7 5.3l1.1-1.1"
      />
    </ToolbarIcon>
  );
}

function SettingsIcon() {
  return (
    <ToolbarIcon>
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        d="M12 3.2 13 5.8l2.4-.6 1 2.3 2.2.9-.9 2.3 1.8 1.7-1.8 1.7.9 2.3-2.2.9-1 2.3-2.4-.6-1 2.6-1-2.6-2.4.6-1-2.3-2.2-.9.9-2.3L3.4 13l1.8-1.7-.9-2.3 2.2-.9 1-2.3 2.4.6z"
      />
    </ToolbarIcon>
  );
}

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
            type="button"
            onClick={onSignOut}
            className="toolbar-btn"
            aria-label="Sign out"
            title="Sign out"
          >
            <SignOutIcon />
          </button>
        )}
        <button
          type="button"
          onClick={toggleMode}
          className="toolbar-btn"
          aria-label={`Switch to ${mode === 'day' ? 'night' : 'day'} mode`}
          title={`Switch to ${mode === 'day' ? 'night' : 'day'} mode`}
        >
          {mode === 'day' ? <MoonIcon /> : <SunIcon />}
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="toolbar-btn"
          aria-label="Open settings"
          title="Settings"
        >
          <SettingsIcon />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
