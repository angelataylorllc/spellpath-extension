#!/usr/bin/env node
/**
 * Backup SQLite user store (safe while API is running). Uses VACUUM INTO (Node 24+).
 * Same env as the API: SPELLPATH_DB_PATH in repo .env on sea0.
 *
 *   node scripts/backup-spellpath-db.mjs
 *   node scripts/backup-spellpath-db.mjs /home/angela/backups
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { DatabaseSync } from 'node:sqlite';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(repoRoot, '.env') });

const dbPath = process.env.SPELLPATH_DB_PATH || '/home/angela/spellpath-data/spellpath.db';
const destDir = process.argv[2] || '/home/angela/backups';

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found: ${dbPath}`);
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
const out = path.join(destDir, `spellpath-${new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '')}.db`);
const escaped = out.replace(/'/g, "''");

const db = new DatabaseSync(dbPath, { readOnly: true });
try {
  db.exec(`VACUUM INTO '${escaped}'`);
} finally {
  db.close();
}

console.log(`Wrote ${out}`);
