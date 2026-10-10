#!/usr/bin/env node
/**
 * Ops helper when sqlite3 CLI is not installed. Uses the same DB as the API (SPELLPATH_DB_PATH).
 *
 *   node scripts/reset-free-stories.mjs list
 *   node scripts/reset-free-stories.mjs reset you@example.com
 */
import 'dotenv/config';
import { closeDb, databasePath, getDb } from '../server/lib/billing/store.js';

const [cmd, arg] = process.argv.slice(2);

if (!cmd || !['list', 'reset'].includes(cmd)) {
  console.error('Usage: node scripts/reset-free-stories.mjs list|reset <email>');
  console.error(`DB: ${databasePath()}`);
  process.exit(1);
}

const db = getDb();

try {
  if (cmd === 'list') {
    const rows = db
      .prepare(
        `SELECT email, name, free_stories_used, plan, subscription_status, updated_at
         FROM users ORDER BY updated_at DESC LIMIT 20`,
      )
      .all();
    console.log(`DB: ${databasePath()}\n`);
    console.table(rows);
    process.exit(0);
  }

  const email = String(arg || '').trim();
  if (!email) {
    console.error('reset requires an email address');
    process.exit(1);
  }

  const iso = new Date().toISOString();
  const result = db
    .prepare(
      `UPDATE users SET free_stories_used = 0, updated_at = ? WHERE lower(email) = lower(?)`,
    )
    .run(iso, email);

  if (result.changes === 0) {
    console.error(`No user found for email: ${email}`);
    process.exit(1);
  }

  const row = db
    .prepare(
      `SELECT email, free_stories_used, plan, subscription_status FROM users WHERE lower(email) = lower(?)`,
    )
    .get(email);
  console.log('Reset free_stories_used → 0');
  console.log(row);
} finally {
  closeDb();
}
