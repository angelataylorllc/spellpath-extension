/**
 * MVP1 abuse backstops: story-bound beats + daily platform LLM cap.
 * @see docs/ai-billing-and-byok.md
 */
import { randomUUID } from 'node:crypto';
import { getDb, transact } from './store.js';

export const SPELLPATH_STORY_SESSION_HEADER = 'x-spellpath-story-session';

function parseIntEnv(value, defaultValue) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : defaultValue;
}

export function getAbuseGuardConfig(env = process.env) {
  return {
    dailyPlatformCalls: parseIntEnv(env.SPELLPATH_DAILY_PLATFORM_LLM_CALLS, 80),
    maxBeatsPerSession: parseIntEnv(env.SPELLPATH_MAX_BEATS_PER_SESSION, 12),
    sessionTtlHours: parseIntEnv(env.SPELLPATH_STORY_SESSION_HOURS, 24),
  };
}

function utcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/**
 * Before spending the platform key for a signed-in user (prod).
 * @returns {{ ok: true } | { ok: false, code: string, message: string }}
 */
export function checkAndRecordPlatformCall(sub, env = process.env) {
  if (!sub) return { ok: true };

  const { dailyPlatformCalls } = getAbuseGuardConfig(env);
  const date = utcDateKey();
  const db = getDb();

  return transact(handle => {
    const row = handle
      .prepare('SELECT call_count FROM platform_daily_usage WHERE google_sub = ? AND utc_date = ?')
      .get(sub, date);

    const count = row?.call_count ?? 0;
    if (count >= dailyPlatformCalls) {
      return {
        ok: false,
        code: 'daily_platform_limit',
        message: 'Daily generation limit reached. Try again tomorrow or contact support.',
      };
    }

    handle.prepare(
      `INSERT INTO platform_daily_usage (google_sub, utc_date, call_count)
       VALUES (?, ?, 1)
       ON CONFLICT(google_sub, utc_date) DO UPDATE SET call_count = call_count + 1`,
    ).run(sub, date);

    return { ok: true };
  });
}

/**
 * @param {string} sub
 * @param {number} [maxBeats]
 */
export function createStorySession(sub, maxBeats, env = process.env) {
  if (!sub) throw new Error('createStorySession requires google sub');

  const { maxBeatsPerSession, sessionTtlHours } = getAbuseGuardConfig(env);
  const cap = maxBeats > 0 ? maxBeats : maxBeatsPerSession;
  const sessionId = randomUUID();
  const created = new Date();
  const expires = new Date(created.getTime() + sessionTtlHours * 60 * 60 * 1000);
  transact(handle => {
    handle.prepare('DELETE FROM story_sessions WHERE google_sub = ?').run(sub);
    handle.prepare(
      `INSERT INTO story_sessions (session_id, google_sub, created_at, expires_at, beats_used, max_beats)
       VALUES (?, ?, ?, ?, 0, ?)`,
    ).run(sessionId, sub, created.toISOString(), expires.toISOString(), cap);
  });

  return sessionId;
}

/**
 * @returns {{ ok: true, session: object } | { ok: false, code: string, message: string }}
 */
export function validateStorySession(sub, sessionId) {
  const id = String(sessionId || '').trim();
  if (!sub || !id) {
    return {
      ok: false,
      code: 'story_session_required',
      message: 'Start a new story before generating beats.',
    };
  }

  const row = getDb().prepare('SELECT * FROM story_sessions WHERE session_id = ?').get(id);
  if (!row || row.google_sub !== sub) {
    return {
      ok: false,
      code: 'story_session_invalid',
      message: 'This story session is invalid. Start a new story from the home screen.',
    };
  }

  if (Date.parse(row.expires_at) <= Date.now()) {
    return {
      ok: false,
      code: 'story_session_expired',
      message: 'This story session expired. Start a new story from the home screen.',
    };
  }

  if (row.beats_used >= row.max_beats) {
    return {
      ok: false,
      code: 'story_session_beat_limit',
      message: 'Beat limit reached for this story. Finish or start a new story.',
    };
  }

  return { ok: true, session: row };
}

/** Call after a beat successfully generated for a metered consumer. */
export function recordStoryBeat(sessionId, sub) {
  const check = validateStorySession(sub, sessionId);
  if (!check.ok) return check;

  getDb()
    .prepare('UPDATE story_sessions SET beats_used = beats_used + 1 WHERE session_id = ? AND google_sub = ?')
    .run(String(sessionId).trim(), sub);

  return { ok: true };
}
