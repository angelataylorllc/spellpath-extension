import assert from 'node:assert/strict';
import test from 'node:test';
import { assertProductionBoot, listenHost } from './boot.js';

test('API binds to 127.0.0.1 unless HOST is set', () => {
  assert.equal(listenHost({}), '127.0.0.1');
  assert.equal(listenHost({ HOST: '' }), '127.0.0.1');
  assert.equal(listenHost({ HOST: '0.0.0.0' }), '0.0.0.0');
});

test('production refuses to boot without SPELLPATH_AUTH_REQUIRED', () => {
  assert.throws(
    () => assertProductionBoot({ NODE_ENV: 'production' }),
    /SPELLPATH_AUTH_REQUIRED=true/,
  );
  assert.throws(
    () => assertProductionBoot({ NODE_ENV: 'production', SPELLPATH_AUTH_REQUIRED: 'false' }),
    /SPELLPATH_AUTH_REQUIRED=true/,
  );
});

test('production boots when auth is required; local NODE_ENV does not need it', () => {
  assert.doesNotThrow(() =>
    assertProductionBoot({ NODE_ENV: 'production', SPELLPATH_AUTH_REQUIRED: 'true' }),
  );
  assert.doesNotThrow(() => assertProductionBoot({ NODE_ENV: 'development' }));
  assert.doesNotThrow(() => assertProductionBoot({}));
});
