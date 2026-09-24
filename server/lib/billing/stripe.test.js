import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { afterEach, beforeEach } from 'node:test';

// Set before importing the modules under test: both read env at load time.
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'spellpath-stripe-'));
process.env.SPELLPATH_DB_PATH = path.join(tmpRoot, 'initial.db');
process.env.SPELLPATH_FREE_STORIES = '3';
process.env.STRIPE_PRICE_BASIC = 'price_basic_5';
process.env.STRIPE_PRICE_PLUS = 'price_plus_10';

const store = await import('./store.js');
const stripe = await import('./stripe.js');

const ANGELA = { sub: 'google-1', email: 'angela@example.com', name: 'Angela' };
const CUSTOMER = 'cus_test_1';

let caseDir = '';

beforeEach(() => {
  store.closeDb();
  caseDir = fs.mkdtempSync(path.join(tmpRoot, 'case-'));
  process.env.SPELLPATH_DB_PATH = path.join(caseDir, 'test.db');

  store.upsertUser(ANGELA);
  store.linkStripeCustomer({ sub: ANGELA.sub, customerId: CUSTOMER });
});

afterEach(() => {
  store.closeDb();
  stripe.setStripeClient(null);
});

function subscriptionEvent(type, { status = 'active', priceId = 'price_basic_5', periodEnd } = {}) {
  const end = periodEnd ?? Math.floor((Date.now() + 30 * 86_400_000) / 1000);
  return {
    id: `evt_${type}_${Math.random().toString(36).slice(2)}`,
    type,
    data: {
      object: {
        id: 'sub_test_1',
        customer: CUSTOMER,
        status,
        current_period_end: end,
        items: { data: [{ price: { id: priceId }, current_period_end: end }] },
      },
    },
  };
}

test('a new subscription grants the plan allowance', async () => {
  const result = await stripe.handleStripeEvent(subscriptionEvent('customer.subscription.created'));
  assert.equal(result.applied, true);

  const state = store.entitlementFor(ANGELA.sub);
  assert.equal(state.plan, 'basic');
  assert.equal(state.subscribed, true);
  assert.equal(state.periodRemaining, 20);
});

test('upgrading to the plus price raises the cap to 50', async () => {
  await stripe.handleStripeEvent(subscriptionEvent('customer.subscription.created'));
  await stripe.handleStripeEvent(
    subscriptionEvent('customer.subscription.updated', { priceId: 'price_plus_10' }),
  );

  const state = store.entitlementFor(ANGELA.sub);
  assert.equal(state.plan, 'plus');
  assert.equal(state.periodRemaining, 50);
});

test('deleting the subscription returns the learner to free credits', async () => {
  await stripe.handleStripeEvent(subscriptionEvent('customer.subscription.created'));
  await stripe.handleStripeEvent(subscriptionEvent('customer.subscription.deleted'));

  const state = store.entitlementFor(ANGELA.sub);
  assert.equal(state.subscribed, false);
  assert.equal(state.plan, 'free');
  assert.equal(state.freeRemaining, 3);
});

test('a renewal invoice resets the monthly allowance', async () => {
  await stripe.handleStripeEvent(subscriptionEvent('customer.subscription.created'));
  for (let i = 0; i < 20; i += 1) store.reserveStory(ANGELA);
  assert.equal(store.entitlementFor(ANGELA.sub).periodRemaining, 0);

  stripe.setStripeClient({
    subscriptions: {
      retrieve: async () => ({
        id: 'sub_test_1',
        status: 'active',
        current_period_end: Math.floor((Date.now() + 30 * 86_400_000) / 1000),
        items: { data: [{ price: { id: 'price_basic_5' } }] },
      }),
    },
  });

  await stripe.handleStripeEvent({
    id: 'evt_invoice_paid_1',
    type: 'invoice.paid',
    data: { object: { customer: CUSTOMER, subscription: 'sub_test_1' } },
  });

  assert.equal(store.entitlementFor(ANGELA.sub).periodRemaining, 20);
});

test('a failed payment marks the account past due and stops plan stories', async () => {
  await stripe.handleStripeEvent(subscriptionEvent('customer.subscription.created'));
  await stripe.handleStripeEvent({
    id: 'evt_failed_1',
    type: 'invoice.payment_failed',
    data: { object: { customer: CUSTOMER } },
  });

  const state = store.entitlementFor(ANGELA.sub);
  assert.equal(state.subscribed, false);
  // Free credits are still theirs to use.
  assert.equal(store.reserveStory(ANGELA).source, 'free');
});

test('a redelivered event is applied only once', async () => {
  const event = subscriptionEvent('customer.subscription.created');
  assert.equal((await stripe.handleStripeEvent(event)).applied, true);

  store.reserveStory(ANGELA);
  assert.equal(store.entitlementFor(ANGELA.sub).periodRemaining, 19);

  const repeat = await stripe.handleStripeEvent(event);
  assert.equal(repeat.applied, false);
  assert.equal(repeat.reason, 'duplicate');
  assert.equal(store.entitlementFor(ANGELA.sub).periodRemaining, 19, 'usage must not be reset twice');
});

test('a handler failure releases the event so Stripe can retry', async () => {
  stripe.setStripeClient({
    subscriptions: {
      retrieve: async () => {
        throw new Error('Stripe is down');
      },
    },
  });

  const event = {
    id: 'evt_retry_1',
    type: 'invoice.paid',
    data: { object: { customer: CUSTOMER, subscription: 'sub_test_1' } },
  };

  await assert.rejects(() => stripe.handleStripeEvent(event), /Stripe is down/);

  // The retry must not be dismissed as a duplicate.
  stripe.setStripeClient({
    subscriptions: {
      retrieve: async () => ({
        id: 'sub_test_1',
        status: 'active',
        current_period_end: Math.floor((Date.now() + 30 * 86_400_000) / 1000),
        items: { data: [{ price: { id: 'price_basic_5' } }] },
      }),
    },
  });

  const retry = await stripe.handleStripeEvent(event);
  assert.equal(retry.applied, true);
  assert.equal(store.entitlementFor(ANGELA.sub).plan, 'basic');
});

test('checkout links the Stripe customer to the Google account', async () => {
  const fresh = { sub: 'google-2', email: 'new@example.com', name: 'New' };
  stripe.setStripeClient({
    customers: { create: async () => ({ id: 'cus_new_1' }) },
    checkout: { sessions: { create: async () => ({ url: 'https://checkout.stripe.test/session' }) } },
  });

  const { url } = await stripe.createCheckoutSession({ user: fresh, planId: 'plus' });

  assert.equal(url, 'https://checkout.stripe.test/session');
  assert.equal(store.getUser(fresh.sub).stripe_customer_id, 'cus_new_1');
});

test('checkout refuses a plan with no configured price', async () => {
  await assert.rejects(
    () => stripe.createCheckoutSession({ user: ANGELA, planId: 'free' }),
    /No Stripe price configured/,
  );
});
