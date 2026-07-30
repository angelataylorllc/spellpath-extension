import { useEffect, useState } from 'react';
import {
  clearUserOpenAIKey,
  getOptionalUserOpenAIKey,
  setUserOpenAIKey,
} from '../services/apiCredentials';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export const Settings = ({ onClose }) => {
  const [openAiKey, setOpenAiKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [platformKeyConfigured, setPlatformKeyConfigured] = useState(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getOptionalUserOpenAIKey()
      .then(key => setHasStoredKey(Boolean(key)))
      .catch(() => setHasStoredKey(false));

    fetch(`${API_BASE}/api/health`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => setPlatformKeyConfigured(Boolean(data?.platformKeyConfigured)))
      .catch(() => setPlatformKeyConfigured(null));
  }, []);

  const handleSaveKey = async () => {
    setBusy(true);
    setStatus('');
    try {
      await setUserOpenAIKey(openAiKey);
      setHasStoredKey(Boolean(openAiKey.trim()));
      setOpenAiKey('');
      setStatus(openAiKey.trim() ? 'Your OpenAI key is saved in this browser.' : 'Key cleared.');
    } catch (err) {
      setStatus(err?.message || 'Could not save key.');
    } finally {
      setBusy(false);
    }
  };

  const handleClearKey = async () => {
    setBusy(true);
    setStatus('');
    try {
      await clearUserOpenAIKey();
      setHasStoredKey(false);
      setOpenAiKey('');
      setStatus('Your key was removed. Requests will use the server key if available.');
    } catch (err) {
      setStatus(err?.message || 'Could not clear key.');
    } finally {
      setBusy(false);
    }
  };

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
          <div className="space-y-2">
            <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
              AI provider
            </p>
            <p className="text-sm opacity-80">
              SpellPath currently uses <strong>OpenAI</strong> (gpt-4o-mini). If the server key is
              out of quota, add your own OpenAI key here — usage bills to your account.
            </p>
            <p className="text-xs opacity-70">
              Server key:{' '}
              {platformKeyConfigured === null
                ? 'unknown (is npm run api running?)'
                : platformKeyConfigured
                  ? 'configured'
                  : 'not configured'}
              {' · '}
              Your key: {hasStoredKey ? 'saved' : 'not set'}
            </p>
            <label className="ui-label" htmlFor="openai-key">
              Your OpenAI API key
            </label>
            <input
              id="openai-key"
              type="password"
              value={openAiKey}
              onChange={(e) => setOpenAiKey(e.target.value)}
              placeholder={hasStoredKey ? 'Paste a new key to replace…' : 'sk-…'}
              className="w-full px-3.5 py-[0.6875rem] genre-input rounded-lg focus:outline-none"
              autoComplete="off"
              disabled={busy}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveKey}
                disabled={busy}
                className="flex-1 genre-button ui-btn py-2 px-4 rounded-lg font-medium"
              >
                Save key
              </button>
              {hasStoredKey && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  disabled={busy}
                  className="flex-1 genre-button ui-btn py-2 px-4 rounded-lg font-medium opacity-80"
                >
                  Remove
                </button>
              )}
            </div>
            {status && <p className="text-xs opacity-80">{status}</p>}
          </div>

          <p className="text-xs opacity-60 border-t pt-3" style={{ borderColor: 'var(--color-accent-soft)' }}>
            Support for other providers (Anthropic, Gemini, etc.) is not wired yet — the server would
            need a provider picker and adapter per API. OpenAI BYOK is available today.
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
