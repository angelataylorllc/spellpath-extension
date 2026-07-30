/** @typedef {'openai' | 'anthropic' | 'gemini'} LLMProvider */

export const LLM_PROVIDERS = /** @type {const} */ (['openai', 'anthropic', 'gemini']);

export const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  // Alias (no date suffix) — Anthropic updates the snapshot it points to over time.
  anthropic: 'claude-haiku-4-5',
  gemini: 'gemini-2.0-flash',
};

/** Fallback aliases if the primary anthropic model 404s (newest first). */
export const ANTHROPIC_MODEL_FALLBACKS = ['claude-haiku-4-5', 'claude-3-5-haiku-latest'];

export const MODEL_ENV_KEYS = {
  openai: 'SPELLPATH_OPENAI_MODEL',
  anthropic: 'SPELLPATH_ANTHROPIC_MODEL',
  gemini: 'SPELLPATH_GEMINI_MODEL',
};

export const PROVIDER_LABELS = {
  openai: 'OpenAI',
  anthropic: 'Anthropic (Claude)',
  gemini: 'Google Gemini',
};

export const PROVIDER_KEY_HINTS = {
  openai: 'sk-…',
  anthropic: 'sk-ant-…',
  gemini: 'AI…',
};

/** @param {string} [value] @returns {LLMProvider | null} */
export function normalizeProvider(value) {
  const v = String(value || '').trim().toLowerCase();
  if (LLM_PROVIDERS.includes(/** @type {LLMProvider} */ (v))) return /** @type {LLMProvider} */ (v);
  return null;
}

/** @param {LLMProvider} provider @param {NodeJS.ProcessEnv} [env] */
export function defaultModel(provider, env = process.env) {
  const candidates = modelCandidates(provider, env);
  return candidates[0] || DEFAULT_MODELS.openai;
}

/** Ordered list of models to try (env override first, then aliases). */
export function modelCandidates(provider, env = process.env) {
  const envKey = MODEL_ENV_KEYS[provider];
  const override = envKey ? String(env[envKey] || '').trim() : '';
  /** @type {string[]} */
  const list = [];

  if (override) list.push(override);

  if (provider === 'anthropic') {
    for (const alias of ANTHROPIC_MODEL_FALLBACKS) {
      if (!list.includes(alias)) list.push(alias);
    }
  } else {
    const base = DEFAULT_MODELS[provider] || DEFAULT_MODELS.openai;
    if (!list.includes(base)) list.push(base);
  }

  return list;
}
