#!/usr/bin/env bash
# Run on sea0 as angela after git push:  bash ~/spellpath-extension/scripts/sea0-deploy.sh
set -euo pipefail

REPO="${HOME}/spellpath-extension"
cd "$REPO"

git pull origin main

mkdir -p "${HOME}/spellpath-data" "${HOME}/backups"

ENV_FILE="${REPO}/.env"
if [[ -f "$ENV_FILE" ]] && ! grep -q '^SPELLPATH_DB_PATH=' "$ENV_FILE"; then
  echo "SPELLPATH_DB_PATH=${HOME}/spellpath-data/spellpath.db" >> "$ENV_FILE"
  echo "Added SPELLPATH_DB_PATH to .env"
fi

export NVM_DIR="${HOME}/.nvm"
# shellcheck source=/dev/null
[[ -s "${NVM_DIR}/nvm.sh" ]] && . "${NVM_DIR}/nvm.sh"
nvm use 24
pm2 restart spellpath-api
pm2 save 2>/dev/null || true

echo "--- health ---"
curl -sS "https://api.spellpath.app/api/health" | head -c 200
echo
