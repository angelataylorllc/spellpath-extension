import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { afterEach, beforeEach } from 'node:test';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'spellpath-quota-'));
process.env.SPELLPATH_DB_PATH = path.join(tmpRoot, 'initial.db');
process.env.SPELLPATH_FREE_STORIES = '3';

const store = await import('./store.js');
const { createStoryQuotaMiddleware } = await import('./middleware.js');

const quota = createStoryQuotaMiddleware();
const LEARNER = { sub: 'g-learner', email: 'learner@example.com', name: 'Lee' };

/** Minimal Express double that records what the route would have sent. */
function fakeResponse() {
  return {
    statusCode: 0,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function run(req) {
  const res = fakeResponse();
  let advanced = false;
  quota(req, res, () => {
    advanced = true;
  });
  return { res, advanced };
}

function consumerRequest(subject = 'clouds') {
  return {
    body: { subject },
    spellpathUser: LEARNER,
    spellpathBilling: { mode: 'consumer', allowPlatformKey: true, metered: true },
  };
}

beforeEach(() => {
  store.closeDb();
  process.env.SPELLPATH_DB_PATH = path.join(fs.mkdtempSync(path.join(tmpRoot, 'case-')), 'test.db');
});

afterEach(() => {
  store.closeDb();
});

test('an unmetered request passes straight through', () => {
  const req = { spellpathBilling: { mode: 'byok', metered: false } };
  const { advanced } = run(req);

  assert.equal(advanced, true);
  assert.equal(typeof req.releaseStory, 'function');
});

test('a consumer spends one free story per scaffold', () => {
  const req = consumerRequest();
  const { advanced } = run(req);

  assert.equal(advanced, true);
  assert.equal(req.storyReservation.source, 'free');
  assert.equal(store.entitlementFor(LEARNER.sub).freeRemaining, 2);
});

test('the fourth story is refused with a payment-required response', () => {
  for (let i = 0; i < 3; i += 1) run(consumerRequest());

  const { res, advanced } = run(consumerRequest());

  assert.equal(advanced, false, 'the route must not run');
  assert.equal(res.statusCode, 402);
  assert.equal(res.body.code, 'free_limit');
  assert.equal(res.body.entitlement.freeRemaining, 0);
});

test('releasing a story hands the credit back exactly once', () => {
  const req = consumerRequest();
  run(req);
  assert.equal(store.entitlementFor(LEARNER.sub).freeRemaining, 2);

  req.releaseStory();
  req.releaseStory();

  assert.equal(store.entitlementFor(LEARNER.sub).freeRemaining, 3, 'double release must not over-credit');
});

test('a metered request with no signed-in user is rejected', () => {
  const { res, advanced } = run({
    body: {},
    spellpathBilling: { mode: 'consumer', metered: true },
  });

  assert.equal(advanced, false);
  assert.equal(res.statusCode, 401);
});

test('the subject is recorded with the story, trimmed to a sane length', () => {
  const req = consumerRequest('x'.repeat(500));
  run(req);

  const logged = store
    .getDb()
    .prepare('SELECT subject FROM usage_log WHERE google_sub = ? ORDER BY id DESC LIMIT 1')
    .get(LEARNER.sub);

  assert.equal(logged.subject.length, 120);
});
