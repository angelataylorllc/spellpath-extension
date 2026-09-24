import express from 'express';
import dotenv from 'dotenv';
import {
  SPELLPATH_API_KEY_HEADER,
  SPELLPATH_BYOK_HEADER,
  SPELLPATH_PROVIDER_HEADER,
  getPlatformKeyStatus,
} from './server/lib/llm/resolveProvider.js';
import { callLLM } from './server/lib/llm/callLLM.js';
import { DEFAULT_MODELS } from './server/lib/llm/providers.js';
import { normalizeIntakeResponse } from './server/lib/normalizeIntake.js';
import { normalizeScaffold } from './server/lib/normalizeScaffold.js';
import { normalizeTopicValidation } from './server/lib/normalizeTopicValidation.js';
import { AUTHOR_EXAMPLES, genreVoicePromptBlock } from './lib/genreVoice.js';
import { normalizeMotivation } from './lib/motivation.js';
import { normalizeLearningFocus } from './lib/learningFocus.js';
import { normalizeAge } from './lib/ageBand.js';
import { resolveAuthorVoiceGuide } from './server/lib/resolveAuthorVoice.js';
import { getAuthConfig } from './server/lib/auth/config.js';
import { createRequireAuthMiddleware } from './server/lib/auth/middleware.js';
import {
  createBillingMiddleware,
  createStoryQuotaMiddleware,
  getBillingConfig,
} from './server/lib/billing/middleware.js';
import { entitlementFor } from './server/lib/billing/store.js';
import { PLANS, priceIdFor } from './server/lib/billing/plans.js';
import {
  constructEvent,
  createCheckoutSession,
  createPortalSession,
  handleStripeEvent,
  stripeConfigured,
} from './server/lib/billing/stripe.js';
import { runBeatPasses } from './server/lib/runBeatPasses.js';
import {
  scaffoldSystemPrompt,
  intakeSystemPrompt,
  validateTopicSystemPrompt,
} from './server/prompts/index.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const authConfig = getAuthConfig();
const billingConfig = getBillingConfig();
const requireAuth = createRequireAuthMiddleware(authConfig);
const withBilling = createBillingMiddleware(authConfig, billingConfig);
const requireStoryQuota = createStoryQuotaMiddleware();

/** Every route that can spend an LLM call. */
const guarded = [requireAuth, withBilling];

const platformKeys = getPlatformKeyStatus();
console.log('Platform keys configured:', platformKeys);
console.log('BYOK allowed:', process.env.SPELLPATH_ALLOW_BYOK !== 'false');
console.log('Auth required:', authConfig.authRequired, '| Allowlist size:', authConfig.allowlist.size);
console.log('Public signup:', authConfig.publicSignup, '| Platform key for allowlist:', billingConfig.platformForAllowlist);

// Stripe signs the exact bytes it sent, so this route must see the raw body
// and therefore has to be mounted before the JSON parser.
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  if (!signature) return res.status(400).json({ error: 'Missing Stripe signature' });

  let event;
  try {
    event = constructEvent(req.body, String(signature));
  } catch (err) {
    console.error('Stripe signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    const result = await handleStripeEvent(event);
    console.log('[stripe]', event.type, result.applied ? 'applied' : `skipped (${result.reason})`);
    return res.json({ received: true });
  } catch (err) {
    // Returning 500 asks Stripe to retry; the event ID keeps that idempotent.
    console.error('Stripe event handling failed:', event.type, err);
    return res.status(500).json({ error: 'Webhook handling failed' });
  }
});

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    `Origin, X-Requested-With, Content-Type, Accept, Authorization, ${SPELLPATH_PROVIDER_HEADER}, ${SPELLPATH_API_KEY_HEADER}, ${SPELLPATH_BYOK_HEADER}`,
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get('/api/auth/me', ...guarded, (req, res) => {
  if (!authConfig.authRequired) {
    return res.json({ authRequired: false });
  }
  return res.json({
    authRequired: true,
    user: {
      email: req.spellpathUser.email,
      name: req.spellpathUser.name,
      picture: req.spellpathUser.picture,
    },
    billingMode: req.spellpathBilling.mode,
    entitlement: req.spellpathBilling.metered ? entitlementFor(req.spellpathUser.sub) : null,
  });
});

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

app.get('/api/billing/status', ...guarded, (req, res) => {
  if (!req.spellpathBilling.metered) {
    return res.json({ metered: false, mode: req.spellpathBilling.mode });
  }
  return res.json({
    metered: true,
    mode: req.spellpathBilling.mode,
    checkoutAvailable: stripeConfigured(),
    plans: Object.values(PLANS)
      .filter(plan => plan.id !== 'free')
      .map(plan => ({ id: plan.id, label: plan.label, available: Boolean(priceIdFor(plan.id)) })),
    entitlement: entitlementFor(req.spellpathUser.sub),
  });
});

app.post('/api/billing/checkout', ...guarded, async (req, res) => {
  try {
    if (!req.spellpathBilling.metered) {
      return res.status(400).json({ error: 'This build does not use subscriptions' });
    }
    if (!stripeConfigured()) {
      return res.status(503).json({ error: 'Payments are not set up yet' });
    }

    const { url } = await createCheckoutSession({
      user: req.spellpathUser,
      planId: String(req.body?.plan || 'basic'),
    });
    return res.json({ url });
  } catch (err) {
    console.error('Checkout session error:', err);
    return res.status(500).json({ error: err.message || 'Could not start checkout' });
  }
});

app.post('/api/billing/portal', ...guarded, async (req, res) => {
  try {
    if (!stripeConfigured()) {
      return res.status(503).json({ error: 'Payments are not set up yet' });
    }
    const { url } = await createPortalSession({ user: req.spellpathUser });
    return res.json({ url });
  } catch (err) {
    console.error('Billing portal error:', err);
    return res.status(400).json({ error: err.message || 'Could not open billing portal' });
  }
});

// ---------------------------------------------------------------------------

app.post('/api/validate-topic', ...guarded, async (req, res) => {
  try {
    const { subject, learningGoals, learningFocus, genre, authorStyle } = req.body || {};
    if (!subject || !String(subject).trim()) {
      return res.status(400).json({ error: 'Missing required field: subject' });
    }

    const parsed = await callLLM(req, 'validate-topic', {
      systemPrompt: validateTopicSystemPrompt,
      userPayload: {
        subject: String(subject).trim(),
        genre: genre || 'adventure',
        learningGoals: learningGoals || '',
        learningFocus: normalizeLearningFocus(learningFocus),
        authorStyle: authorStyle || '',
        curatedAuthorsForGenre: AUTHOR_EXAMPLES[genre] || '',
      },
      maxTokens: 400,
      temperature: 0.2,
    });

    return res.json(
      normalizeTopicValidation(parsed, {
        subject: String(subject).trim(),
        learningGoals: learningGoals || '',
        authorStyle: authorStyle || '',
        genre: genre || 'adventure',
      }),
    );
  } catch (err) {
    console.error('Topic validation error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Topic validation failed' });
  }
});

app.post('/api/intake', ...guarded, async (req, res) => {
  try {
    const { subject, genre, age, level, motivation, learningGoals, learningFocus } = req.body || {};
    if (!subject) {
      return res.status(400).json({ error: 'Missing required field: subject' });
    }

    const parsed = await callLLM(req, 'intake', {
      systemPrompt: intakeSystemPrompt,
      userPayload: {
        subject,
        genre: genre || 'adventure',
        genreNote: 'Story genre only — do NOT ask quiz questions about genre or storytelling.',
        age: normalizeAge(age),
        level: level || 'beginner',
        motivation: normalizeMotivation(motivation),
        learningFocus: normalizeLearningFocus(learningFocus),
        learningGoals: learningGoals || '',
      },
      maxTokens: 500,
      temperature: 0.6,
    });

    return res.json(normalizeIntakeResponse(parsed, { subject, learningGoals }));
  } catch (err) {
    console.error('Intake generation error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Intake generation failed' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/scaffold
// ---------------------------------------------------------------------------

app.post('/api/scaffold', ...guarded, requireStoryQuota, async (req, res) => {
  try {
    const { subject, genre, mode, level, age, motivation, learningGoals, learningFocus, answers, topicCategory, authorStyle } =
      req.body || {};
    if (!subject || !genre || !mode) {
      req.releaseStory();
      return res.status(400).json({ error: 'Missing required fields: subject, genre, mode' });
    }

    const authorVoice = await resolveAuthorVoiceGuide(req, { authorStyle, genre });

    const resolvedMotivation = normalizeMotivation(motivation);
    const resolvedFocus = normalizeLearningFocus(learningFocus);

    const parsed = await callLLM(req, 'scaffold', {
      systemPrompt: scaffoldSystemPrompt,
      userPayload: {
        subject,
        genre,
        mode,
        level: level || 'beginner',
        age: normalizeAge(age),
        motivation: resolvedMotivation,
        learningFocus: resolvedFocus,
        learningGoals: learningGoals || '',
        topicCategory: topicCategory || 'standard',
        authorStyle: authorStyle || '',
        genreVoice: genreVoicePromptBlock(genre),
        authorStyleGuide: authorVoice.compactGuide || authorVoice.guide,
        answers: answers || [],
      },
      maxTokens: 4000,
      temperature: 0.5,
    });

    return res.json({
      ...normalizeScaffold(parsed, { motivation: resolvedMotivation, learningFocus: resolvedFocus }),
      topicCategory: topicCategory || parsed?.topicCategory || 'standard',
      authorStyle: authorStyle || '',
      authorVoiceGuide: authorVoice.guide,
      authorVoiceSource: authorVoice.source,
      entitlement: req.spellpathBilling.metered ? entitlementFor(req.spellpathUser.sub) : null,
    });
  } catch (err) {
    // A story we could not deliver should not count against the learner.
    req.releaseStory();
    console.error('Scaffold generation error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Scaffold generation failed' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/beat
// ---------------------------------------------------------------------------

app.post('/api/beat', ...guarded, async (req, res) => {
  try {
    const {
      scaffold,
      currentBeat,
      learnerProfile,
      storySoFar,
      recentCheckpoints,
      learnerDirection,
      steerOverride,
      genre,
      mode,
      beatIndex,
      totalBeats,
      previousNarrativeOpening,
    } = req.body || {};
    if (!scaffold || !currentBeat) {
      return res.status(400).json({ error: 'Missing required fields: scaffold, currentBeat' });
    }

    const parsed = await runBeatPasses(req, {
      scaffold,
      currentBeat,
      learnerProfile,
      storySoFar,
      recentCheckpoints,
      learnerDirection,
      steerOverride,
      genre,
      mode,
      beatIndex,
      totalBeats,
      previousNarrativeOpening,
    });

    return res.json(parsed);
  } catch (err) {
    console.error('Beat generation error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Beat generation failed' });
  }
});

// ---------------------------------------------------------------------------

app.get('/api/health', (_req, res) => {
  const keys = getPlatformKeyStatus();
  return res.json({
    ok: true,
    authRequired: authConfig.authRequired,
    allowlistConfigured: authConfig.allowlist.size > 0,
    publicSignup: authConfig.publicSignup,
    byokAllowed: process.env.SPELLPATH_ALLOW_BYOK !== 'false',
    platformKeyConfigured: keys.openai || keys.anthropic || keys.gemini,
    providers: {
      openai: { platformKeyConfigured: keys.openai, defaultModel: DEFAULT_MODELS.openai },
      anthropic: { platformKeyConfigured: keys.anthropic, defaultModel: DEFAULT_MODELS.anthropic },
      gemini: { platformKeyConfigured: keys.gemini, defaultModel: DEFAULT_MODELS.gemini },
    },
  });
});

app.listen(port, () => {
  console.log(`SpellPath API running on http://localhost:${port}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use — another SpellPath API is still running.`);
    console.error(`Stop it first, then restart:  fuser -k ${port}/tcp`);
    process.exit(1);
  }
  throw err;
});
