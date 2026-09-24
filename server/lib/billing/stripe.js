/**
 * Stripe Checkout + webhook handling.
 *
 * Angela is the seller of record; the Chrome Web Store takes no cut. Checkout
 * runs in a normal browser tab because extension popups cannot host Stripe.
 *
 * @see docs/ai-billing-and-byok.md
 */
import Stripe from 'stripe';
import { planForPriceId, priceIdFor, planFor } from './plans.js';
import {
  applySubscription,
  forgetStripeEvent,
  getUser,
  getUserByStripeCustomer,
  linkStripeCustomer,
  markStripeEventSeen,
  upsertUser,
} from './store.js';

/** @type {Stripe | null} */
let client = null;

export function stripeConfigured(env = process.env) {
  return Boolean(String(env.STRIPE_SECRET_KEY || '').trim());
}

export function getStripe(env = process.env) {
  if (client) return client;
  const key = String(env.STRIPE_SECRET_KEY || '').trim();
  if (!key) throw new Error('Stripe is not configured on this server');
  client = new Stripe(key);
  return client;
}

/** Test hook. */
export function setStripeClient(next) {
  client = next;
}

/**
 * Reuse the customer we already know about, otherwise create one keyed to the
 * Google account so a returning learner keeps their history.
 *
 * @param {{ sub: string, email: string, name?: string }} user
 */
async function customerFor(user, env = process.env) {
  const existing = getUser(user.sub);
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const customer = await getStripe(env).customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: { google_sub: user.sub },
  });

  upsertUser(user);
  linkStripeCustomer({ sub: user.sub, customerId: customer.id });
  return customer.id;
}

/**
 * @param {{ user: { sub: string, email: string, name?: string }, planId: string }} args
 * @returns {Promise<{ url: string }>}
 */
export async function createCheckoutSession({ user, planId }, env = process.env) {
  const plan = planFor(planId);
  const price = priceIdFor(plan.id, env);
  if (!price) throw new Error(`No Stripe price configured for the ${plan.id} plan`);

  const customer = await customerFor(user, env);
  const returnUrl = String(env.SPELLPATH_CHECKOUT_RETURN_URL || 'https://spellpath.app').trim();

  const session = await getStripe(env).checkout.sessions.create({
    mode: 'subscription',
    customer,
    line_items: [{ price, quantity: 1 }],
    client_reference_id: user.sub,
    subscription_data: { metadata: { google_sub: user.sub } },
    success_url: `${returnUrl}?checkout=success`,
    cancel_url: `${returnUrl}?checkout=cancelled`,
  });

  return { url: session.url };
}

/** @param {{ sub: string }} user */
export async function createPortalSession({ user }, env = process.env) {
  const row = getUser(user.sub);
  if (!row?.stripe_customer_id) throw new Error('No subscription to manage yet');

  const returnUrl = String(env.SPELLPATH_CHECKOUT_RETURN_URL || 'https://spellpath.app').trim();
  const session = await getStripe(env).billingPortal.sessions.create({
    customer: row.stripe_customer_id,
    return_url: returnUrl,
  });

  return { url: session.url };
}

function periodEndOf(subscription) {
  const seconds =
    subscription?.current_period_end ??
    subscription?.items?.data?.[0]?.current_period_end ??
    null;
  return Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : '';
}

function planOfSubscription(subscription, env) {
  const priceId = subscription?.items?.data?.[0]?.price?.id || '';
  return planForPriceId(priceId, env)?.id || null;
}

/**
 * Apply a verified Stripe event to the user store.
 * Unknown event types are acknowledged and ignored.
 *
 * @param {import('stripe').Stripe.Event} event
 */
export async function handleStripeEvent(event, env = process.env) {
  if (!markStripeEventSeen(event.id, event.type)) {
    return { applied: false, reason: 'duplicate' };
  }

  try {
    return await applyStripeEvent(event, env);
  } catch (err) {
    // Give the ID back so Stripe's retry is not mistaken for a duplicate.
    forgetStripeEvent(event.id);
    throw err;
  }
}

/** @param {import('stripe').Stripe.Event} event */
async function applyStripeEvent(event, env) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const sub = String(session.client_reference_id || session.metadata?.google_sub || '');
      const customerId = String(session.customer || '');
      if (sub && customerId && !getUserByStripeCustomer(customerId)) {
        linkStripeCustomer({ sub, customerId });
      }
      // The subscription events carry the plan and period; nothing else to do.
      return { applied: true };
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = String(subscription.customer || '');
      const status = event.type === 'customer.subscription.deleted' ? 'canceled' : String(subscription.status || '');

      applySubscription({
        customerId,
        subscriptionId: String(subscription.id || ''),
        plan: planOfSubscription(subscription, env) || undefined,
        status,
        periodEnd: periodEndOf(subscription),
        // A brand-new subscription starts its allowance at zero.
        resetUsage: event.type === 'customer.subscription.created',
      });
      return { applied: true };
    }

    case 'invoice.paid': {
      // A renewal: the new month's allowance starts fresh.
      const invoice = event.data.object;
      const customerId = String(invoice.customer || '');
      const subscriptionId = String(invoice.subscription || invoice.parent?.subscription_details?.subscription || '');
      if (!customerId) return { applied: false, reason: 'no_customer' };

      let plan;
      let periodEnd = '';
      if (subscriptionId) {
        const subscription = await getStripe(env).subscriptions.retrieve(subscriptionId);
        plan = planOfSubscription(subscription, env) || undefined;
        periodEnd = periodEndOf(subscription);
      }

      applySubscription({
        customerId,
        subscriptionId,
        plan,
        status: 'active',
        periodEnd,
        resetUsage: true,
      });
      return { applied: true };
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      applySubscription({
        customerId: String(invoice.customer || ''),
        status: 'past_due',
      });
      return { applied: true };
    }

    default:
      return { applied: false, reason: 'ignored' };
  }
}

/**
 * Verify the Stripe signature over the raw request body.
 * @param {Buffer} rawBody
 * @param {string} signature
 */
export function constructEvent(rawBody, signature, env = process.env) {
  const secret = String(env.STRIPE_WEBHOOK_SECRET || '').trim();
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  return getStripe(env).webhooks.constructEvent(rawBody, signature, secret);
}
