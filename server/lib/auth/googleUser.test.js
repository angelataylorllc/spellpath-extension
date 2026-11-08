import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthError, assertAllowlisted, editionForAudience, fetchGoogleUser } from './googleUser.js';

const CONSUMER_ID = 'consumer.apps.googleusercontent.com';
const BYOK_ID = 'byok.apps.googleusercontent.com';
const config = {
  authRequired: true,
  allowlist: new Set(['friend@example.com']),
  publicSignup: false,
  consumerClientIds: new Set([CONSUMER_ID]),
  byokClientIds: new Set([BYOK_ID]),
};

test('edition follows token audience, not a request header', () => {
  assert.equal(editionForAudience(config, { aud: CONSUMER_ID }), 'consumer');
  assert.equal(editionForAudience(config, { azp: BYOK_ID }), 'byok');
  assert.throws(
    () => editionForAudience(config, { aud: 'other.apps.googleusercontent.com' }),
    (err) => err instanceof AuthError && err.status === 401,
  );
});

test('unknown audience is allowed only when no SpellPath client IDs are configured', () => {
  assert.equal(editionForAudience({ consumerClientIds: new Set(), byokClientIds: new Set() }, { aud: 'x' }), null);
});

test('consumer edition skips the friends invite list', () => {
  assertAllowlisted(config, { email: 'stranger@example.com', edition: 'consumer' });
});

test('friends edition still needs the invite list while public signup is off', () => {
  assert.throws(
    () => assertAllowlisted(config, { email: 'stranger@example.com', edition: 'byok' }),
    (err) => err instanceof AuthError && err.status === 403,
  );
  assertAllowlisted(config, { email: 'friend@example.com', edition: 'byok' });
});

test('fetchGoogleUser binds edition from tokeninfo aud', async () => {
  const fetchImpl = async (url) => {
    if (String(url).includes('tokeninfo')) {
      return {
        ok: true,
        json: async () => ({ aud: CONSUMER_ID, sub: 'g-1', email: 'learner@example.com' }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        email: 'learner@example.com',
        name: 'Learner',
        picture: '',
        sub: 'g-1',
      }),
    };
  };

  const user = await fetchGoogleUser('ya29.example', config, { fetchImpl });
  assert.equal(user.edition, 'consumer');
  assert.equal(user.email, 'learner@example.com');
});
