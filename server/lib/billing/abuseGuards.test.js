import assert from 'node:assert/strict';
import test from 'node:test';
import { closeDb } from './store.js';
import {
  checkAndRecordPlatformCall,
  createStorySession,
  recordStoryBeat,
  validateStorySession,
} from './abuseGuards.js';

const ENV = {
  SPELLPATH_DB_PATH: ':memory:',
  SPELLPATH_DAILY_PLATFORM_LLM_CALLS: '3',
  SPELLPATH_MAX_BEATS_PER_SESSION: '2',
};

test('platform daily cap blocks after limit', () => {
  closeDb();
  const sub = 'g-test-daily';

  assert.equal(checkAndRecordPlatformCall(sub, ENV).ok, true);
  assert.equal(checkAndRecordPlatformCall(sub, ENV).ok, true);
  assert.equal(checkAndRecordPlatformCall(sub, ENV).ok, true);

  const blocked = checkAndRecordPlatformCall(sub, ENV);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, 'daily_platform_limit');
});

test('story session binds beats to scaffold', () => {
  closeDb();
  const sub = 'g-test-session';
  const sessionId = createStorySession(sub, 2, ENV);

  assert.equal(validateStorySession(sub, sessionId).ok, true);
  assert.equal(validateStorySession('other', sessionId).ok, false);

  recordStoryBeat(sessionId, sub);
  assert.equal(validateStorySession(sub, sessionId).ok, true);

  recordStoryBeat(sessionId, sub);
  assert.equal(validateStorySession(sub, sessionId).ok, false);
});
