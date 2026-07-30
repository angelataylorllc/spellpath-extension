import { useEffect, useState } from 'react';
import {
  clearProviderKey,
  DEFAULT_MODELS,
  getLLMKeyStatus,
  LLM_PROVIDERS,
  PROVIDER_KEY_HINTS,
  PROVIDER_LABELS,
  setActiveLLMProvider,
  setLLMCredentials,
} from '../services/apiCredentials';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export const Settings = ({ onClose }) => {
  const [provider, setProvider] = useState('openai');
  const [saved, setSaved] = useState({ openai: false, anthropic: false, gemini: false });
  const [apiKey, setApiKey] = useState('');
  const [platformStatus, setPlatformStatus] = useState(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const refreshKeyStatus = async () => {
    const keyStatus = await getLLMKeyStatus().catch(() => null);
    if (keyStatus) {
      setProvider(keyStatus.activeProvider);
      setSaved(keyStatus.saved);
    }
  };

  useEffect(() => {
    refreshKeyStatus();

    fetch(`${API_BASE}/api/health`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => setPlatformStatus(data?.providers || null))
      .catch(() => setPlatformStatus(null));
  }, []);

  const handleProviderChange = async (nextProvider) => {
    setProvider(nextProvider);
    setApiKey('');
    setStatus('');
    try {
      await setActiveLLMProvider(nextProvider);
    } catch (err) {
      setStatus(err?.message || 'Could not switch provider.');
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setStatus('Paste an API key first, or use Remove to delete a saved key.');
      return;
    }

    setBusy(true);
    setStatus('');
    try {
      await setLLMCredentials({ provider, apiKey, setActive: true });
      await refreshKeyStatus();
      setApiKey('');
      setStatus(`${PROVIDER_LABELS[provider]} key saved.`);
    } catch (err) {
      setStatus(err?.message || 'Could not save credentials.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    setStatus('');
    try {
      await clearProviderKey(provider);
      await refreshKeyStatus();
      setApiKey('');
      setStatus(`${PROVIDER_LABELS[provider]} key removed.`);
    } catch (err) {
      setStatus(err?.message || 'Could not remove key.');
    } finally {
      setBusy(false);
    }
  };

  const serverLine = (id) => {
    const info = platformStatus?.[id];
    if (!info) return 'unknown';
    return info.platformKeyConfigured ? 'server key set' : 'no server key';
  };

  const currentSaved = saved[provider];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="rounded-xl shadow-2xl max-w-md w-full p-6 space-y-6 border max-h-[90vh] overflow-y-auto"
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
              AI provider (BYOK)
            </p>
            <p className="text-sm opacity-80">
              Save a key for each provider you use. Pick which one is <strong>active</strong> —
              that provider runs your stories. Usage bills to your account.
            </p>

            <div
              className="rounded-lg border p-3 space-y-1.5 text-sm"
              style={{ borderColor: 'var(--color-accent-soft)' }}
            >
              <p className="text-xs font-medium opacity-70 mb-1">Your saved keys</p>
              {LLM_PROVIDERS.map(id => (
                <div key={id} className="flex items-center justify-between gap-2">
                  <span className={id === provider ? 'font-medium' : ''}>
                    {PROVIDER_LABELS[id]}
                    {id === provider && (
                      <span className="text-xs opacity-70 ml-1">(active)</span>
                    )}
                  </span>
                  <span
                    className="text-xs shrink-0"
                    style={{ color: saved[id] ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                  >
                    {saved[id] ? '✓ key saved' : '— no key'}
                  </span>
                </div>
              ))}
            </div>

            <label className="ui-label" htmlFor="llm-provider">
              Active provider
            </label>
            <select
              id="llm-provider"
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-3.5 py-[0.6875rem] genre-input rounded-lg focus:outline-none"
              disabled={busy}
            >
              {LLM_PROVIDERS.map(id => (
                <option key={id} value={id}>
                  {PROVIDER_LABELS[id]} ({DEFAULT_MODELS[id]})
                  {saved[id] ? ' ✓' : ''}
                </option>
              ))}
            </select>

            <p className="text-xs opacity-70">
              Server fallback for {PROVIDER_LABELS[provider]}: {serverLine(provider)}
            </p>

            <label className="ui-label" htmlFor="llm-api-key">
              API key for {PROVIDER_LABELS[provider]}
            </label>
            <input
              id="llm-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                currentSaved ? 'Paste a new key to replace…' : PROVIDER_KEY_HINTS[provider]
              }
              className="w-full px-3.5 py-[0.6875rem] genre-input rounded-lg focus:outline-none"
              autoComplete="off"
              disabled={busy}
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={busy}
                className="flex-1 genre-button ui-btn py-2 px-4 rounded-lg font-medium"
              >
                Save key
              </button>
              {currentSaved && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={busy}
                  className="flex-1 genre-button ui-btn py-2 px-4 rounded-lg font-medium opacity-80"
                >
                  Remove
                </button>
              )}
            </div>
            {status && <p className="text-xs opacity-80">{status}</p>}
          </div>

          <div className="text-xs opacity-60 border-t pt-3 space-y-1" style={{ borderColor: 'var(--color-accent-soft)' }}>
            <p>Server platform keys (optional in .env):</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>OpenAI — OPENAI_API_KEY ({serverLine('openai')})</li>
              <li>Anthropic — ANTHROPIC_API_KEY ({serverLine('anthropic')})</li>
              <li>Gemini — GEMINI_API_KEY or GOOGLE_API_KEY ({serverLine('gemini')})</li>
            </ul>
          </div>
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
