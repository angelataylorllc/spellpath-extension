import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(root, '.env.production') });

const manifestPath = path.join(root, 'dist', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const clientId = String(process.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '').trim();
const authRequired = process.env.VITE_AUTH_REQUIRED !== 'false';

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
