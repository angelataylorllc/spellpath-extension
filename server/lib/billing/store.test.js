import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { afterEach, beforeEach } from 'node:test';

/** Each test gets a throwaway database file. */
let tmpDir = '';
let store;

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spellpath-store-'));
  process.env.SPELLPATH_DB_PATH = path.join(tmpDir, 'test.db');
  process.env.SPELLPATH_FREE_STORIES = '3';

  // Re-import so this test gets its own database handle.
  store = await import(`./store.js?case=${Math.random()}`);
});

afterEach(() => {
  store.closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const ANGELA = { sub: 'google-1', email: 'angela@example.com', name: 'Angela' };

test('a new user gets the full free allowance', () => {
  store.upsertUser(ANGELA);
  const state = store.entitlementFor(ANGELA.sub);

  assert.equal(state.plan, 'free');
  assert.equal(state.subscribed, false);
  assert.equal(state.freeRemaining, 3);
  assert.equal(state.canStartStory, true);
});

test('free stories run out after the limit and then block', () => {
  for (let i = 0; i < 3; i += 1) {
    const result = store.reserveStory({ ...ANGELA, subject: `story ${i}` });
    assert.equal(result.ok, true, `story ${i} should be allowed`);
    assert.equal(result.source, 'free');
    assert.equal(result.remaining, 2 - i);
  }

  const blocked = store.reserveStory(ANGELA);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, 'free_limit');
  assert.equal(store.entitlementFor(ANGELA.sub).canStartStory, false);
});

test('a failed story is refunded and can be retried', () => {
  store.reserveStory(ANGELA);
  store.reserveStory(ANGELA);
  const third = store.reserveStory(ANGELA);
  assert.equal(third.ok, true);

  store.refundStory(ANGELA.sub, 'free');

  assert.equal(store.entitlementFor(ANGELA.sub).freeRemaining, 1);
  assert.equal(store.reserveStory(ANGELA).ok, true);
});

test('an active subscription spends plan stories, not free ones', () => {
  store.upsertUser(ANGELA);
  store.linkStripeCustomer({ sub: ANGELA.sub, customerId: 'cus_123' });
  store.applySubscription({
    customerId: 'cus_123',
    subscriptionId: 'sub_123',
    plan: 'basic',
    status: 'active',
    periodEnd: new Date(Date.now() + 86_400_000).toISOString(),
    resetUsage: true,
  });

  const result = store.reserveStory(ANGELA);
  assert.equal(result.ok, true);
  assert.equal(result.source, 'plan');
  assert.equal(result.remaining, 19);

  const state = store.entitlementFor(ANGELA.sub);
  assert.equal(state.plan, 'basic');
  assert.equal(state.subscribed, true);
  assert.equal(state.freeRemaining, 3, 'free credits stay untouched while subscribed');
});

test('the monthly cap blocks the 21st story on the basic plan', () => {
  store.upsertUser(ANGELA);
  store.linkStripeCustomer({ sub: ANGELA.sub, customerId: 'cus_123' });
  store.applySubscription({
    customerId: 'cus_123',
    plan: 'basic',
    status: 'active',
    periodEnd: new Date(Date.now() + 86_400_000).toISOString(),
    resetUsage: true,
  });

  for (let i = 0; i < 20; i += 1) {
    assert.equal(store.reserveStory(ANGELA).ok, true, `plan story ${i}`);
  }

  const blocked = store.reserveStory(ANGELA);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, 'plan_limit');
});

test('a lapsed period rolls forward instead of stranding a subscriber', () => {
  store.upsertUser(ANGELA);
  store.linkStripeCustomer({ sub: ANGELA.sub, customerId: 'cus_123' });
  store.applySubscription({
    customerId: 'cus_123',
    plan: 'basic',
    status: 'active',
    periodEnd: new Date(Date.now() + 86_400_000).toISOString(),
    resetUsage: true,
  });

  for (let i = 0; i < 20; i += 1) store.reserveStory(ANGELA);
  assert.equal(store.reserveStory(ANGELA).reason, 'plan_limit');

  // Stand in for the month elapsing without a renewal webhook arriving.
  store.applySubscription({
    customerId: 'cus_123',
    plan: 'basic',
    status: 'active',
    periodEnd: new Date(Date.now() - 86_400_000).toISOString(),
  });

  const state = store.entitlementFor(ANGELA.sub);
  assert.equal(state.periodRemaining, 20);
  assert.ok(Date.parse(state.periodEnd) > Date.now(), 'period end moves into the future');
  assert.equal(store.reserveStory(ANGELA).ok, true);
});

test('cancelling drops the user back to free credits', () => {
  store.upsertUser(ANGELA);
  store.linkStripeCustomer({ sub: ANGELA.sub, customerId: 'cus_123' });
  store.applySubscription({ customerId: 'cus_123', plan: 'basic', status: 'active', resetUsage: true });
  store.applySubscription({ customerId: 'cus_123', status: 'canceled' });

  const state = store.entitlementFor(ANGELA.sub);
  assert.equal(state.plan, 'free');
  assert.equal(state.subscribed, false);
  assert.equal(state.freeRemaining, 3);
  assert.equal(store.reserveStory(ANGELA).source, 'free');
});

test('a repeated Stripe event is only accepted once', () => {
  assert.equal(store.markStripeEventSeen('evt_1', 'invoice.paid'), true);
  assert.equal(store.markStripeEventSeen('evt_1', 'invoice.paid'), false);
  assert.equal(store.markStripeEventSeen('evt_2', 'invoice.paid'), true);
});

test('a webhook for an unknown customer is ignored rather than throwing', () => {
  assert.equal(store.applySubscription({ customerId: 'cus_nobody', status: 'active' }), null);
});
