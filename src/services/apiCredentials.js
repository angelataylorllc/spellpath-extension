/**
 * Optional BYOK (bring your own key) for the extension.
 * Stores one key per provider; user picks which provider is active for requests.
 *
 * @see docs/ai-billing-and-byok.md
 */

const CREDENTIALS_KEY = 'spellpath_llm_credentials';
const LEGACY_OPENAI_KEY = 'spellpath_user_openai_key';

/** @typedef {'openai' | 'anthropic' | 'gemini'} LLMProvider */

export const LLM_PROVIDERS = /** @type {const} */ (['openai', 'anthropic', 'gemini']);

export const PROVIDER_LABELS = {
  openai: 'OpenAI',
  anthropic: 'Anthropic (Claude)',
  gemini: 'Google Gemini',
};

export const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5',
  gemini: 'gemini-2.0-flash',
};

export const PROVIDER_KEY_HINTS = {
  openai: 'sk-…',
  anthropic: 'sk-ant-…',
  gemini: 'AI…',
};

function getChromeStorageLocal() {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return chrome.storage.local;
  }
  return null;
}

function normalizeProvider(value) {
  const v = String(value || '').trim().toLowerCase();
  return LLM_PROVIDERS.includes(/** @type {LLMProvider} */ (v)) ? /** @type {LLMProvider} */ (v) : null;
}

/** @returns {Record<LLMProvider, string>} */
function emptyKeys() {
  return { openai: '', anthropic: '', gemini: '' };
}

/** @param {Record<LLMProvider, string>} keys */
function firstProviderWithKey(keys) {
  return LLM_PROVIDERS.find(p => keys[p]) || 'openai';
}

/**
 * @param {unknown} raw
 * @param {string} [legacyOpenAI]
 * @returns {{ activeProvider: LLMProvider, keys: Record<LLMProvider, string> }}
 */
function migrateCredentials(raw, legacyOpenAI) {
  const keys = emptyKeys();
  let activeProvider = /** @type {LLMProvider} */ ('openai');

  if (raw && typeof raw === 'object') {
    const obj = /** @type {Record<string, unknown>} */ (raw);

    if (obj.keys && typeof obj.keys === 'object') {
      for (const p of LLM_PROVIDERS) {
        const v = /** @type {Record<string, unknown>} */ (obj.keys)[p];
        if (typeof v === 'string' && v.trim()) keys[p] = v.trim();
      }
      activeProvider = normalizeProvider(obj.activeProvider) || firstProviderWithKey(keys);
    } else if (typeof obj.apiKey === 'string' && obj.apiKey.trim()) {
      const p = normalizeProvider(obj.provider) || 'openai';
      keys[p] = obj.apiKey.trim();
      activeProvider = p;
    } else {
      for (const p of LLM_PROVIDERS) {
        if (typeof obj[p] === 'string' && obj[p].trim()) keys[p] = obj[p].trim();
      }
      activeProvider = normalizeProvider(obj.activeProvider) || firstProviderWithKey(keys);
    }
  }

  if (!keys.openai && typeof legacyOpenAI === 'string' && legacyOpenAI.trim()) {
    keys.openai = legacyOpenAI.trim();
    if (!LLM_PROVIDERS.some(p => p !== 'openai' && keys[p])) {
      activeProvider = 'openai';
    }
  }

  if (!keys[activeProvider]) {
    activeProvider = firstProviderWithKey(keys);
  }

  return { activeProvider, keys };
}

/** @param {{ activeProvider: LLMProvider, keys: Record<LLMProvider, string> }} creds */
function serializeForStorage({ activeProvider, keys }) {
  /** @type {Partial<Record<LLMProvider, string>>} */
  const storedKeys = {};
  for (const p of LLM_PROVIDERS) {
    if (keys[p]?.trim()) storedKeys[p] = keys[p].trim();
  }
  return {
    activeProvider,
    keys: storedKeys,
  };
}

async function loadCredentials() {
  const storage = getChromeStorageLocal();
  if (!storage) {
    return { activeProvider: /** @type {LLMProvider} */ ('openai'), keys: emptyKeys() };
  }

  const result = await new Promise((resolve, reject) => {
    storage.get([CREDENTIALS_KEY, LEGACY_OPENAI_KEY], data => {
      const err = chrome.runtime?.lastError;
      if (err) reject(err);
      else resolve(data);
    });
  });

  return migrateCredentials(result[CREDENTIALS_KEY], result[LEGACY_OPENAI_KEY]);
}

async function persistCredentials(creds) {
  const storage = getChromeStorageLocal();
  if (!storage) {
    throw new Error('chrome.storage.local is not available');
  }

  const payload = serializeForStorage(creds);
  const hasAnyKey = LLM_PROVIDERS.some(p => payload.keys[p]);

  return new Promise((resolve, reject) => {
    if (!hasAnyKey) {
      storage.remove([CREDENTIALS_KEY, LEGACY_OPENAI_KEY], () => {
        const err = chrome.runtime?.lastError;
        if (err) reject(err);
        else resolve();
      });
      return;
    }

    storage.set({ [CREDENTIALS_KEY]: payload }, () => {
      const err = chrome.runtime?.lastError;
      if (err) reject(err);
      else storage.remove([LEGACY_OPENAI_KEY], () => resolve());
    });
  });
}

/**
 * Active provider + its key (for API requests).
 * @returns {Promise<{ provider: LLMProvider, apiKey: string } | undefined>}
 */
export async function getLLMCredentials() {
  const { activeProvider, keys } = await loadCredentials();
  const apiKey = keys[activeProvider];
  if (!apiKey) return undefined;
  return { provider: activeProvider, apiKey };
}

/**
 * @returns {Promise<{ activeProvider: LLMProvider, saved: Record<LLMProvider, boolean> }>}
 */
export async function getLLMKeyStatus() {
  const { activeProvider, keys } = await loadCredentials();
  return {
    activeProvider,
    saved: Object.fromEntries(LLM_PROVIDERS.map(p => [p, Boolean(keys[p])])),
  };
}

/**
 * Save or replace the API key for one provider. Does not remove other providers' keys.
 * Pass empty apiKey to remove that provider's key only.
 * @param {{ provider: LLMProvider, apiKey: string, setActive?: boolean }} credentials
 */
export async function setLLMCredentials({ provider, apiKey, setActive = true }) {
  const normalizedProvider = normalizeProvider(provider) || 'openai';
  const trimmed = typeof apiKey === 'string' ? apiKey.trim() : '';
  const creds = await loadCredentials();

  creds.keys[normalizedProvider] = trimmed;
  if (setActive && trimmed) {
    creds.activeProvider = normalizedProvider;
  } else if (!creds.keys[creds.activeProvider]) {
    creds.activeProvider = firstProviderWithKey(creds.keys);
  }

  await persistCredentials(creds);
}

/** Switch active provider without changing stored keys. */
export async function setActiveLLMProvider(provider) {
  const normalizedProvider = normalizeProvider(provider);
  if (!normalizedProvider) return;

  const creds = await loadCredentials();
  creds.activeProvider = normalizedProvider;
  await persistCredentials(creds);
}

/** Remove one provider's key; leaves others intact. */
export async function clearProviderKey(provider) {
  return setLLMCredentials({ provider, apiKey: '', setActive: false });
}

/** Remove all stored keys. */
export async function clearAllLLMKeys() {
  await persistCredentials({ activeProvider: 'openai', keys: emptyKeys() });
}

/** @deprecated Use clearProviderKey */
export async function clearLLMCredentials() {
  return clearAllLLMKeys();
}

/** @returns {Promise<string|undefined>} */
export async function getOptionalUserOpenAIKey() {
  const creds = await loadCredentials();
  return creds.keys.openai || undefined;
}

/** @param {string} key @returns {Promise<void>} */
export async function setUserOpenAIKey(key) {
  return setLLMCredentials({ provider: 'openai', apiKey: key });
}

/** @returns {Promise<void>} */
export async function clearUserOpenAIKey() {
  return clearProviderKey('openai');
}
