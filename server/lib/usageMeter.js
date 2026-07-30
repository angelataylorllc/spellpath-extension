/**
 * Usage / metering hook — platform (A) vs BYOK (C).
 * @see docs/ai-billing-and-byok.md
 */

/**
 * @typedef {Object} UsageRecord
 * @property {string} route
 * @property {'openai' | 'anthropic' | 'gemini'} [provider]
 * @property {string} [model]
 * @property {'platform' | 'byok'} billingSource
 * @property {number} [promptTokens]
 * @property {number} [completionTokens]
 * @property {number} [totalTokens]
 */

/** @param {UsageRecord} record */
export function recordLLMUsage(record) {
  const log = String(process.env.SPELLPATH_USAGE_LOG || '').toLowerCase();
  const enabled = ['1', 'true', 'yes'].includes(log);

  if (enabled) {
    console.log('[spellpath-usage]', {
      t: new Date().toISOString(),
      ...record,
    });
  }
}

/** @deprecated Use recordLLMUsage */
export function recordOpenAIUsage(record) {
  recordLLMUsage({ provider: 'openai', ...record });
}
