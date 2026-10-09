#!/usr/bin/env bash
# Backup SQLite user store (quotas, Stripe IDs). Run on sea0 as angela.
set -euo pipefail

DB="${SPELLPATH_DB_PATH:-/home/angela/spellpath-data/spellpath.db}"
DEST="${1:-/home/angela/backups}"

mkdir -p "$DEST"
OUT="$DEST/spellpath-$(date +%F-%H%M).db"

if [[ ! -f "$DB" ]]; then
  echo "Database not found: $DB" >&2
  exit 1
fi

sqlite3 "$DB" ".backup '$OUT'"
echo "Wrote $OUT"
