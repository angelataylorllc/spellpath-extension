/**
 * Resolve LLM provider + API key for a request (platform or BYOK).
 *
 * @see docs/ai-billing-and-byok.md
 */
import { defaultModel, LLM_PROVIDERS, modelCandidates, normalizeProvider } from './providers.js';

/** @deprecated Use SPELLPATH_API_KEY_HEADER — kept for backward compatibility. */
export const SPELLPATH_BYOK_HEADER = 'x-spellpath-openai-key';

export const SPELLPATH_PROVIDER_HEADER = 'x-spellpath-provider';
export const SPELLPATH_API_KEY_HEADER = 'x-spellpath-api-key';

function platformKeyForProvider(provider, env) {
  switch (provider) {
    case 'anthropic':
      return (env.ANTHROPIC_API_KEY || '').trim();
    case 'gemini':
      return (env.GEMINI_API_KEY || env.GOOGLE_API_KEY || '').trim();
    case 'openai':
    default:
      return (env.OPENAI_API_KEY || '').trim();
  }
}

function byokAllowed(env) {
  return !['0', 'false', 'no'].includes(String(env.SPELLPATH_ALLOW_BYOK || 'true').toLowerCase());
}

function withModels(provider, env, rest) {
  return {
    ...rest,
    model: defaultModel(provider, env),
    models: modelCandidates(provider, env),
  };
}

/**
 * @param {import('express').Request} req
 * @param {NodeJS.ProcessEnv} [env]
 */
export function resolveLLMForRequest(req, env = process.env) {
  const allowByok = byokAllowed(env);
  const requestedProvider = normalizeProvider(req.headers[SPELLPATH_PROVIDER_HEADER]) || 'openai';
  const genericKey = String(req.headers[SPELLPATH_API_KEY_HEADER] || '').trim();
  const legacyOpenAiKey = String(req.headers[SPELLPATH_BYOK_HEADER] || '').trim();

  if (allowByok && genericKey) {
    return withModels(requestedProvider, env, {
      provider: requestedProvider,
      apiKey: genericKey,
      billingSource: /** @type {const} */ ('byok'),
    });
  }

  if (allowByok && legacyOpenAiKey) {
    return withModels('openai', env, {
      provider: 'openai',
      apiKey: legacyOpenAiKey,
      billingSource: /** @type {const} */ ('byok'),
    });
  }

  const platformKey = platformKeyForProvider(requestedProvider, env);
  if (platformKey) {
    return withModels(requestedProvider, env, {
      provider: requestedProvider,
      apiKey: platformKey,
      billingSource: /** @type {const} */ ('platform'),
    });
  }

  const configured = LLM_PROVIDERS.filter(p => platformKeyForProvider(p, env)).join(', ') || 'none';

  return withModels(requestedProvider, env, {
    provider: requestedProvider,
    apiKey: null,
    billingSource: null,
    error: allowByok
      ? `No API key for ${requestedProvider}. Set a platform key on the server (${configured}) or add your key in Settings.`
      : `No platform API key for ${requestedProvider}. BYOK is disabled on this server.`,
  });
}

export function getPlatformKeyStatus(env = process.env) {
  return {
    openai: !!platformKeyForProvider('openai', env),
    anthropic: !!platformKeyForProvider('anthropic', env),
    gemini: !!platformKeyForProvider('gemini', env),
  };
}

/** @deprecated Use resolveLLMForRequest */
export function resolveOpenAIForRequest(req, env = process.env) {
  const resolved = resolveLLMForRequest(req, env);
  if (resolved.provider !== 'openai') {
    return {
      client: null,
      billingSource: null,
      error: 'Legacy OpenAI resolver called for a non-OpenAI provider.',
    };
  }
  if (!resolved.apiKey) {
    return { client: null, billingSource: null, error: resolved.error };
  }
  return {
    client: null,
    billingSource: resolved.billingSource,
    _resolved: resolved,
  };
}
