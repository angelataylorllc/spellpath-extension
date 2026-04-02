/**
 * Usage / metering hook — platform (A) vs BYOK (C).
 * Today: structured logging + extension points for quotas (DB, Stripe meter, etc.).
 *
 * @see docs/ai-billing-and-byok.md
 */

/**
 * @typedef {Object} UsageRecord
 * @property {string} route - e.g. 'intake', 'scaffold', 'beat', 'generate'
 * @property {'platform' | 'byok'} billingSource
 * @property {number} [promptTokens]
 * @property {number} [completionTokens]
 * @property {number} [totalTokens]
 */

/**
 * @param {UsageRecord} record
 */
export function recordOpenAIUsage(record) {
  const log = String(process.env.SPELLPATH_USAGE_LOG || '').toLowerCase();
  const enabled = ['1', 'true', 'yes'].includes(log);

  if (enabled) {
    // Never log API keys or payloads
    console.log('[spellpath-usage]', {
      t: new Date().toISOString(),
      ...record,
    });
  }

  // Future: if (record.billingSource === 'platform') { await enforceQuota(...); await persist(...); }
}
