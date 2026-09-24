import assert from 'node:assert/strict';
import test from 'node:test';
import { createBillingMiddleware, getBillingConfig } from './middleware.js';
import { resolveLLMForRequest, SPELLPATH_API_KEY_HEADER } from '../llm/resolveProvider.js';

const FRIENDS_ONLY = { authRequired: true, allowlist: new Set(['cj@example.com']), publicSignup: false };
const PUBLIC = { authRequired: true, allowlist: new Set(['cj@example.com']), publicSignup: true };

/** The server has Angela's Anthropic key loaded. */
const SERVER_ENV = { ANTHROPIC_API_KEY: 'sk-ant-platform', SPELLPATH_ALLOW_BYOK: 'true' };

function classify(authConfig, envOverrides, req) {
  const middleware = createBillingMiddleware(authConfig, getBillingConfig({ ...SERVER_ENV, ...envOverrides }));
  const request = { headers: {}, ...req };
  middleware(request, {}, () => {});
  return request;
}

test('local development keeps working with no auth and no metering', () => {
  const req = classify({ authRequired: false, allowlist: new Set(), publicSignup: false }, {}, {});

  assert.equal(req.spellpathBilling.mode, 'local');
  assert.equal(req.spellpathBilling.allowPlatformKey, true);
  assert.equal(req.spellpathBilling.metered, false);
});

test('a friend with their own key is not metered and never touches the platform key', () => {
  const req = classify(FRIENDS_ONLY, {}, {
    headers: { [SPELLPATH_API_KEY_HEADER]: 'sk-their-own' },
    spellpathUser: { email: 'cj@example.com', sub: 'g-cj' },
  });

  assert.equal(req.spellpathBilling.mode, 'byok');
  assert.equal(req.spellpathBilling.metered, false);

  const resolved = resolveLLMForRequest(req, SERVER_ENV);
  assert.equal(resolved.billingSource, 'byok');
  assert.equal(resolved.apiKey, 'sk-their-own');
});

test('a friend with no key is refused the platform key', () => {
  const req = classify(FRIENDS_ONLY, {}, {
    spellpathUser: { email: 'cj@example.com', sub: 'g-cj' },
  });

  assert.equal(req.spellpathBilling.mode, 'friend');
  assert.equal(req.spellpathBilling.allowPlatformKey, false);

  const resolved = resolveLLMForRequest(req, SERVER_ENV);
  assert.equal(resolved.apiKey, null, 'platform key must not leak to an unmetered friend');
  assert.match(resolved.error, /own API key/i);
});

test('a stranger is refused entirely while public signup is off', () => {
  const req = classify(FRIENDS_ONLY, {}, {
    spellpathUser: { email: 'stranger@example.com', sub: 'g-x' },
  });

  assert.equal(req.spellpathBilling.mode, 'blocked');
  assert.equal(resolveLLMForRequest(req, SERVER_ENV).apiKey, null);
});

test('a consumer is metered and may spend the platform key once signup is public', () => {
  const req = classify(PUBLIC, { SPELLPATH_PUBLIC_SIGNUP: 'true' }, {
    spellpathUser: { email: 'learner@example.com', sub: 'g-learner' },
  });

  assert.equal(req.spellpathBilling.mode, 'consumer');
  assert.equal(req.spellpathBilling.metered, true);

  const resolved = resolveLLMForRequest(req, SERVER_ENV);
  assert.equal(resolved.billingSource, 'platform');
  assert.equal(resolved.apiKey, 'sk-ant-platform');
  assert.equal(resolved.provider, 'anthropic');
});

test('a request that skipped billing classification cannot reach the platform key', () => {
  const resolved = resolveLLMForRequest({ headers: {} }, SERVER_ENV);

  assert.equal(resolved.apiKey, null, 'unclassified requests must fail closed');
  assert.equal(resolved.billingSource, null);
});

test('a consumer cannot redirect spending to a different provider via headers', () => {
  const req = classify(PUBLIC, { SPELLPATH_PUBLIC_SIGNUP: 'true' }, {
    headers: { 'x-spellpath-provider': 'openai' },
    spellpathUser: { email: 'learner@example.com', sub: 'g-learner' },
  });

  // Only Anthropic is funded, so an OpenAI request finds no key to spend.
  const resolved = resolveLLMForRequest(req, SERVER_ENV);
  assert.equal(resolved.apiKey, null);
});
