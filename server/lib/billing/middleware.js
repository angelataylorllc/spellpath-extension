/**
 * Decide who may spend the platform API key, and meter stories for consumers.
 *
 * Friends bring their own key and are never metered. Consumers spend free
 * credits or their subscription. Nobody reaches the platform key by accident —
 * `resolveLLMForRequest` refuses to hand it out unless `allowPlatformKey` is
 * set here.
 *
 * @see docs/ai-billing-and-byok.md
 */
import { getAuthConfig, normalizeEmail } from '../auth/config.js';
import {
  SPELLPATH_API_KEY_HEADER,
  SPELLPATH_BYOK_HEADER,
} from '../llm/resolveProvider.js';
import { entitlementFor, refundStory, reserveStory } from './store.js';

function parseBool(value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return !['0', 'false', 'no'].includes(String(value).toLowerCase());
}

function requestCarriesKey(req) {
  const generic = String(req.headers[SPELLPATH_API_KEY_HEADER] || '').trim();
  const legacy = String(req.headers[SPELLPATH_BYOK_HEADER] || '').trim();
  return Boolean(generic || legacy);
}

export function getBillingConfig(env = process.env) {
  return {
    /** Let any Google account in, not just the invite list. Off until MVP1 ships. */
    publicSignup: parseBool(env.SPELLPATH_PUBLIC_SIGNUP, false),
    /** Let invited friends spend the platform key — for testing the paid flow. */
    platformForAllowlist: parseBool(env.SPELLPATH_PLATFORM_FOR_ALLOWLIST, false),
    byokAllowed: parseBool(env.SPELLPATH_ALLOW_BYOK, true),
  };
}

/**
 * Classify the request before any LLM work happens.
 * Runs after requireAuth, so req.spellpathUser is set whenever auth is on.
 */
export function createBillingMiddleware(authConfig = getAuthConfig(), billingConfig = getBillingConfig()) {
  return (req, _res, next) => {
    // Local development: no auth, no accounts, no metering.
    if (!authConfig.authRequired) {
      req.spellpathBilling = { mode: 'local', allowPlatformKey: true, metered: false };
      return next();
    }

    if (billingConfig.byokAllowed && requestCarriesKey(req)) {
      req.spellpathBilling = { mode: 'byok', allowPlatformKey: false, metered: false };
      return next();
    }

    const email = normalizeEmail(req.spellpathUser?.email);
    const isFriend = authConfig.allowlist.has(email);

    if (isFriend && !billingConfig.platformForAllowlist) {
      req.spellpathBilling = { mode: 'friend', allowPlatformKey: false, metered: false };
      return next();
    }

    const entitled = billingConfig.publicSignup || billingConfig.platformForAllowlist;
    req.spellpathBilling = {
      mode: entitled ? 'consumer' : 'blocked',
      allowPlatformKey: entitled,
      metered: entitled,
    };
    return next();
  };
}

/**
 * Spend one story before generating a scaffold. Attaches a release function so
 * the route can refund the story if generation fails.
 */
export function createStoryQuotaMiddleware() {
  return (req, res, next) => {
    const billing = req.spellpathBilling;

    if (!billing?.metered) {
      req.releaseStory = () => {};
      return next();
    }

    const user = req.spellpathUser;
    if (!user?.sub) {
      return res.status(401).json({ error: 'Sign in required', code: 'auth_required' });
    }

    const result = reserveStory({
      sub: user.sub,
      email: user.email,
      name: user.name,
      subject: String(req.body?.subject || '').slice(0, 120),
    });

    if (!result.ok) {
      const state = entitlementFor(user.sub);
      return res.status(402).json({
        error:
          result.reason === 'plan_limit'
            ? 'You have used every story in this month’s plan.'
            : 'You have used your free stories.',
        code: result.reason === 'plan_limit' ? 'plan_limit' : 'free_limit',
        entitlement: state,
      });
    }

    let released = false;
    req.releaseStory = () => {
      if (released) return;
      released = true;
      refundStory(user.sub, result.source);
    };
    req.storyReservation = result;

    return next();
  };
}
