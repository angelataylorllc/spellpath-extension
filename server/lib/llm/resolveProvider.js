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

function firstConfiguredPlatform(env) {
  const preferred = normalizeProvider(env.SPELLPATH_PLATFORM_PROVIDER) || 'anthropic';
  const order = [preferred, 'anthropic', 'openai', 'gemini'];
  for (const provider of order) {
    if (platformKeyForProvider(provider, env)) return provider;
  }
  return preferred;
}

/**
 * @param {import('express').Request} req
 * @param {NodeJS.ProcessEnv} [env]
 */
export function resolveLLMForRequest(req, env = process.env) {
  const allowByok = byokAllowed(env);
  const headerProvider = normalizeProvider(req.headers[SPELLPATH_PROVIDER_HEADER]);
  const genericKey = String(req.headers[SPELLPATH_API_KEY_HEADER] || '').trim();
  const legacyOpenAiKey = String(req.headers[SPELLPATH_BYOK_HEADER] || '').trim();

  if (allowByok && genericKey) {
    const provider = headerProvider || 'openai';
    return withModels(provider, env, {
      provider,
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

  // The platform key is Angela's money. Billing middleware must vouch for the
  // request before it can be spent; an unclassified request never qualifies.
  const allowPlatformKey = req.spellpathBilling?.allowPlatformKey === true;

  const platformProvider = headerProvider || firstConfiguredPlatform(env);
  const platformKey = allowPlatformKey ? platformKeyForProvider(platformProvider, env) : '';
  if (platformKey) {
    return withModels(platformProvider, env, {
      provider: platformProvider,
      apiKey: platformKey,
      billingSource: /** @type {const} */ ('platform'),
    });
  }

  const configured = LLM_PROVIDERS.filter(p => platformKeyForProvider(p, env)).join(', ') || 'none';

  let error;
  if (!allowPlatformKey && platformKeyForProvider(platformProvider, env)) {
    error = allowByok
      ? 'Add your own API key in Settings to generate stories.'
      : 'This account is not allowed to generate stories.';
  } else if (allowByok) {
    error = `No API key for ${platformProvider}. Set a platform key on the server (${configured}) or add your key in Settings.`;
  } else {
    error = `No platform API key for ${platformProvider}. BYOK is disabled on this server.`;
  }

  return withModels(platformProvider, env, {
    provider: platformProvider,
    apiKey: null,
    billingSource: null,
    error,
  });
}

export function getPlatformKeyStatus(env = process.env) {
  return {
    openai: !!platformKeyForProvider('openai', env),
    anthropic: !!platformKeyForProvider('anthropic', env),
    gemini: !!platformKeyForProvider('gemini', env),
  };
}
