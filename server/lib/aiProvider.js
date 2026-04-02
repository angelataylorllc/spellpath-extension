/**
 * Resolves which OpenAI client to use for a request.
 *
 * - Platform (A): SPELLPATH-hosted — uses OPENAI_API_KEY from env (meter this).
 * - BYOK (C): Caller sends X-SpellPath-OpenAI-Key — usage bills to their OpenAI account.
 *
 * @see docs/ai-billing-and-byok.md
 */
import OpenAI from 'openai';

/** Request header for optional user-supplied OpenAI API key (Chrome extension BYOK). */
export const SPELLPATH_BYOK_HEADER = 'x-spellpath-openai-key';

/**
 * @param {import('express').Request} req
 * @param {NodeJS.ProcessEnv} [env=process.env]
 * @returns {{ client: OpenAI | null, billingSource: 'platform' | 'byok' | null, error?: string }}
 */
export function resolveOpenAIForRequest(req, env = process.env) {
  const platformKey = (env.OPENAI_API_KEY || '').trim();
  const allowByok = !['0', 'false', 'no'].includes(
    String(env.SPELLPATH_ALLOW_BYOK || 'true').toLowerCase()
  );

  const headerKey = String(req.headers[SPELLPATH_BYOK_HEADER] || '').trim();

  if (allowByok && headerKey) {
    return {
      client: new OpenAI({ apiKey: headerKey }),
      billingSource: 'byok',
    };
  }

  if (platformKey) {
    return {
      client: new OpenAI({ apiKey: platformKey }),
      billingSource: 'platform',
    };
  }

  return {
    client: null,
    billingSource: null,
    error: allowByok
      ? 'No API key: set OPENAI_API_KEY on the server or send X-SpellPath-OpenAI-Key.'
      : 'No API key: set OPENAI_API_KEY on the server (BYOK is disabled).',
  };
}
