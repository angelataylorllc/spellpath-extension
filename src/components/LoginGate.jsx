import SceneAtmosphere from './SceneAtmosphere';

export function LoginGate({ onSignIn, loading, error }) {
  return (
    <main className="scene">
      <SceneAtmosphere />
      <div className="scene__content scene__content--intake ui-font">
        <div className="mb-4 text-center sm:text-left">
          <h1 className="text-[1.6875rem] font-bold tracking-wide genre-title m-0">SpellPath</h1>
          <p className="ui-subtitle">Sign in to start your learning adventure</p>
        </div>

        <div className="genre-card p-3.5 rounded-lg border space-y-4">
          <p className="ui-meta">
            Friend preview — sign in with an invited Google account, then add your AI key in Settings.
          </p>

          {error && (
            <p className="ui-meta text-sm" style={{ color: 'var(--color-accent)' }}>
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={onSignIn}
            disabled={loading}
            className="w-full genre-button ui-btn px-5 py-[0.6875rem] rounded-lg"
          >
            {loading ? 'Signing in…' : 'Sign in with Google'}
          </button>
        </div>
      </div>
    </main>
  );
}
