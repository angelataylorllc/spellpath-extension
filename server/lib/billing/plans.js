/**
 * Subscription tiers and story caps.
 * @see docs/ai-billing-and-byok.md
 */

/** Lifetime free stories before a subscription is required. */
export const FREE_STORY_LIMIT = Number(process.env.SPELLPATH_FREE_STORIES || 3);

/** A story is one scaffold; beats within that story are not metered separately. */
export const PLANS = {
  free: { id: 'free', label: 'Free', storiesPerPeriod: 0, priceEnv: '' },
  basic: { id: 'basic', label: '20 stories / month', storiesPerPeriod: 20, priceEnv: 'STRIPE_PRICE_BASIC' },
  plus: { id: 'plus', label: '50 stories / month', storiesPerPeriod: 50, priceEnv: 'STRIPE_PRICE_PLUS' },
};

/** Stripe statuses that still entitle a subscriber to their monthly stories. */
const LIVE_STATUSES = new Set(['active', 'trialing']);

/** @param {string} status */
export function statusIsLive(status) {
  return LIVE_STATUSES.has(String(status || '').toLowerCase());
}

/** @param {string} id */
export function planFor(id) {
  return PLANS[String(id || '').toLowerCase()] || PLANS.free;
}

/**
 * Map a Stripe price ID back to a plan, so webhooks do not hardcode tiers.
 * @param {string} priceId
 * @param {NodeJS.ProcessEnv} [env]
 */
export function planForPriceId(priceId, env = process.env) {
  const target = String(priceId || '').trim();
  if (!target) return null;

  for (const plan of Object.values(PLANS)) {
    if (!plan.priceEnv) continue;
    if (String(env[plan.priceEnv] || '').trim() === target) return plan;
  }
  return null;
}

/** @param {NodeJS.ProcessEnv} [env] */
export function priceIdFor(planId, env = process.env) {
  const plan = planFor(planId);
  if (!plan.priceEnv) return '';
  return String(env[plan.priceEnv] || '').trim();
}
