import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(root, '.env.production') });

const edition = process.env.VITE_EDITION === 'consumer' ? 'consumer' : 'byok';
const outDir = process.env.SPELLPATH_OUT_DIR || (edition === 'consumer' ? 'dist-consumer' : 'dist-byok');
const manifestPath = path.join(root, outDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const sharedClientId = String(process.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '').trim();
const unpackedFriends = String(process.env.VITE_GOOGLE_OAUTH_CLIENT_ID_BYOK_UNPACKED || '').trim();
const useUnpackedFriends =
  edition === 'byok' &&
  ['1', 'true', 'yes'].includes(String(process.env.SPELLPATH_UNPACKED_OAUTH || '').toLowerCase());

const editionClientId = String(
  edition === 'consumer'
    ? process.env.VITE_GOOGLE_OAUTH_CLIENT_ID_CONSUMER || sharedClientId
    : useUnpackedFriends && unpackedFriends
      ? unpackedFriends
      : process.env.VITE_GOOGLE_OAUTH_CLIENT_ID_BYOK || sharedClientId,
).trim();
const clientId = editionClientId;
const authRequired = process.env.VITE_AUTH_REQUIRED !== 'false';

manifest.name = edition === 'consumer' ? 'SpellPath' : 'SpellPath (Friends)';
manifest.action = {
  ...(manifest.action || {}),
  default_title: edition === 'consumer' ? 'Open SpellPath' : 'Open SpellPath (Friends)',
};

if (authRequired && clientId) {
  manifest.permissions = [...new Set([...(manifest.permissions || []), 'identity'])];
  manifest.oauth2 = {
    client_id: clientId,
    scopes: ['openid', 'email', 'profile'],
  };
} else {
  delete manifest.oauth2;
  manifest.permissions = (manifest.permissions || []).filter(p => p !== 'identity');
}

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
