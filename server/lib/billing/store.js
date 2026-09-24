/**
 * SQLite-backed user store: free-story counts, subscription state, Stripe IDs.
 *
 * One process owns this file, so reads and writes are synchronous. Quota
 * changes still run inside transactions so a crash cannot leave a half-applied
 * reservation.
 *
 * @see docs/ai-billing-and-byok.md
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FREE_STORY_LIMIT, planFor, statusIsLive } from './plans.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  google_sub           TEXT PRIMARY KEY,
  email                TEXT NOT NULL,
  name                 TEXT NOT NULL DEFAULT '',
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL,
  free_stories_used    INTEGER NOT NULL DEFAULT 0,
  plan                 TEXT NOT NULL DEFAULT 'free',
  subscription_status  TEXT NOT NULL DEFAULT '',
  stripe_customer_id   TEXT,
  stripe_subscription_id TEXT,
  stories_this_period  INTEGER NOT NULL DEFAULT 0,
  period_end           TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_stripe_customer_idx ON users(stripe_customer_id);

CREATE TABLE IF NOT EXISTS stripe_events (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  received_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  google_sub TEXT NOT NULL,
  at         TEXT NOT NULL,
  source     TEXT NOT NULL,
  subject    TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS usage_log_user_idx ON usage_log(google_sub, at);
`;

/** @type {DatabaseSync | null} */
let db = null;

function nowIso() {
  return new Date().toISOString();
}

/** Default lives beside the author-voice cache; override on the server. */
export function databasePath(env = process.env) {
  const configured = String(env.SPELLPATH_DB_PATH || '').trim();
  return configured || path.join(repoRoot, 'data', 'spellpath.db');
}

export function getDb(env = process.env) {
  if (db) return db;

  const file = databasePath(env);
  fs.mkdirSync(path.dirname(file), { recursive: true });

  db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

/** Test hook — drops the cached handle so the next call reopens. */
export function closeDb() {
  if (db) db.close();
  db = null;
}

function transact(fn) {
  const handle = getDb();
  handle.exec('BEGIN IMMEDIATE');
  try {
    const result = fn(handle);
    handle.exec('COMMIT');
    return result;
  } catch (err) {
    handle.exec('ROLLBACK');
    throw err;
  }
}

/**
 * Insert the user on first sight, refresh email/name on later visits.
 * @param {{ sub: string, email: string, name?: string }} user
 */
export function upsertUser({ sub, email, name = '' }) {
  if (!sub) throw new Error('upsertUser requires a Google sub');
  const at = nowIso();

  getDb()
    .prepare(
      `INSERT INTO users (google_sub, email, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(google_sub) DO UPDATE SET
         email = excluded.email,
         name = excluded.name,
         updated_at = excluded.updated_at`,
    )
    .run(sub, email, name, at, at);

  return getUser(sub);
}

/** @param {string} sub */
export function getUser(sub) {
  return getDb().prepare('SELECT * FROM users WHERE google_sub = ?').get(sub) || null;
}

/** @param {string} customerId */
export function getUserByStripeCustomer(customerId) {
  if (!customerId) return null;
  return getDb().prepare('SELECT * FROM users WHERE stripe_customer_id = ?').get(customerId) || null;
}

/**
 * Roll a lapsed billing period forward so a missed renewal webhook does not
 * strand a paying subscriber at zero stories.
 */
function rollPeriodIfExpired(handle, row) {
  if (!row.period_end) return row;
  const end = Date.parse(row.period_end);
  if (!Number.isFinite(end) || Date.now() < end) return row;

  const next = new Date(end);
  while (next.getTime() <= Date.now()) next.setMonth(next.getMonth() + 1);

  handle
    .prepare('UPDATE users SET stories_this_period = 0, period_end = ?, updated_at = ? WHERE google_sub = ?')
    .run(next.toISOString(), nowIso(), row.google_sub);

  return { ...row, stories_this_period: 0, period_end: next.toISOString() };
}

/**
 * What the user is allowed to do right now, without spending anything.
 * @param {string} sub
 */
export function entitlementFor(sub) {
  const row = getUser(sub);
  if (!row) {
    return {
      plan: 'free',
      subscribed: false,
      freeRemaining: FREE_STORY_LIMIT,
      periodRemaining: 0,
      periodEnd: '',
      canStartStory: FREE_STORY_LIMIT > 0,
    };
  }

  const fresh = transact(handle => rollPeriodIfExpired(handle, row));
  const plan = planFor(fresh.plan);
  const subscribed = statusIsLive(fresh.subscription_status) && plan.storiesPerPeriod > 0;
  const freeRemaining = Math.max(0, FREE_STORY_LIMIT - fresh.free_stories_used);
  const periodRemaining = subscribed
    ? Math.max(0, plan.storiesPerPeriod - fresh.stories_this_period)
    : 0;

  return {
    plan: plan.id,
    subscribed,
    freeRemaining,
    periodRemaining,
    periodEnd: fresh.period_end || '',
    canStartStory: periodRemaining > 0 || freeRemaining > 0,
  };
}

/**
 * Spend one story. Subscription allowance is used before free stories so a
 * subscriber keeps their free credits if they later cancel.
 *
 * @param {{ sub: string, email: string, name?: string, subject?: string }} user
 * @returns {{ ok: boolean, source?: 'plan' | 'free', reason?: string, remaining?: number }}
 */
export function reserveStory({ sub, email, name = '', subject = '' }) {
  upsertUser({ sub, email, name });

  return transact(handle => {
    const row = rollPeriodIfExpired(handle, handle.prepare('SELECT * FROM users WHERE google_sub = ?').get(sub));
    const plan = planFor(row.plan);
    const at = nowIso();

    if (statusIsLive(row.subscription_status) && plan.storiesPerPeriod > 0) {
      if (row.stories_this_period < plan.storiesPerPeriod) {
        handle
          .prepare('UPDATE users SET stories_this_period = stories_this_period + 1, updated_at = ? WHERE google_sub = ?')
          .run(at, sub);
        handle
          .prepare('INSERT INTO usage_log (google_sub, at, source, subject) VALUES (?, ?, ?, ?)')
          .run(sub, at, 'plan', subject);
        return {
          ok: true,
          source: /** @type {const} */ ('plan'),
          remaining: plan.storiesPerPeriod - row.stories_this_period - 1,
        };
      }
      return { ok: false, reason: 'plan_limit', remaining: 0 };
    }

    if (row.free_stories_used < FREE_STORY_LIMIT) {
      handle
        .prepare('UPDATE users SET free_stories_used = free_stories_used + 1, updated_at = ? WHERE google_sub = ?')
        .run(at, sub);
      handle
        .prepare('INSERT INTO usage_log (google_sub, at, source, subject) VALUES (?, ?, ?, ?)')
        .run(sub, at, 'free', subject);
      return {
        ok: true,
        source: /** @type {const} */ ('free'),
        remaining: FREE_STORY_LIMIT - row.free_stories_used - 1,
      };
    }

    return { ok: false, reason: 'free_limit', remaining: 0 };
  });
}

/**
 * Hand a story back when generation failed, so a server error is not billed
 * to the learner.
 * @param {string} sub
 * @param {'plan' | 'free'} source
 */
export function refundStory(sub, source) {
  const column = source === 'plan' ? 'stories_this_period' : 'free_stories_used';

  transact(handle => {
    handle
      .prepare(`UPDATE users SET ${column} = MAX(0, ${column} - 1), updated_at = ? WHERE google_sub = ?`)
      .run(nowIso(), sub);
    handle
      .prepare('INSERT INTO usage_log (google_sub, at, source, subject) VALUES (?, ?, ?, ?)')
      .run(sub, nowIso(), `refund:${source}`, '');
  });
}

/** @param {{ sub: string, customerId: string }} link */
export function linkStripeCustomer({ sub, customerId }) {
  getDb()
    .prepare('UPDATE users SET stripe_customer_id = ?, updated_at = ? WHERE google_sub = ?')
    .run(customerId, nowIso(), sub);
}

/**
 * Apply subscription state from a Stripe webhook.
 * @param {{ customerId: string, subscriptionId?: string, plan?: string, status: string, periodEnd?: string, resetUsage?: boolean }} update
 */
export function applySubscription({ customerId, subscriptionId = '', plan, status, periodEnd = '', resetUsage = false }) {
  const row = getUserByStripeCustomer(customerId);
  if (!row) return null;

  const nextPlan = plan || row.plan;
  const at = nowIso();

  transact(handle => {
    handle
      .prepare(
        `UPDATE users SET
           plan = ?,
           subscription_status = ?,
           stripe_subscription_id = ?,
           period_end = ?,
           stories_this_period = ?,
           updated_at = ?
         WHERE google_sub = ?`,
      )
      .run(
        statusIsLive(status) ? nextPlan : 'free',
        status,
        subscriptionId || row.stripe_subscription_id || '',
        periodEnd || row.period_end || '',
        resetUsage ? 0 : row.stories_this_period,
        at,
        row.google_sub,
      );
  });

  return getUser(row.google_sub);
}

/**
 * Record a Stripe event ID. Returns false when we have already handled it,
 * which is how retried webhook deliveries stay idempotent.
 * @param {string} id
 * @param {string} type
 */
export function markStripeEventSeen(id, type) {
  try {
    getDb()
      .prepare('INSERT INTO stripe_events (id, type, received_at) VALUES (?, ?, ?)')
      .run(id, type, nowIso());
    return true;
  } catch {
    return false;
  }
}

/**
 * Release a claimed event ID after handling failed, so Stripe's retry is not
 * mistaken for a duplicate and dropped.
 * @param {string} id
 */
export function forgetStripeEvent(id) {
  getDb().prepare('DELETE FROM stripe_events WHERE id = ?').run(id);
}
