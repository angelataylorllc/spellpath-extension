#!/usr/bin/env bash
# Install daily SpellPath DB backup on sea0 (run once as angela after git pull).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LINE="0 3 * * * cd $ROOT && SPELLPATH_DB_PATH=\${SPELLPATH_DB_PATH:-/home/angela/spellpath-data/spellpath.db} node scripts/backup-spellpath-db.mjs /home/angela/backups >> /home/angela/backups/backup.log 2>&1"

mkdir -p /home/angela/backups
( crontab -l 2>/dev/null | grep -v 'backup-spellpath-db' || true
  echo "$LINE"
) | crontab -

echo "Installed crontab entry:"
crontab -l | grep backup-spellpath-db
