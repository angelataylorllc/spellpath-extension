import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../data');
const CACHE_PATH = path.join(DATA_DIR, 'author-voice-cache.json');

function emptyCache() {
  return { version: 1, authors: {} };
}

export function readAuthorVoiceCache() {
  try {
    const parsed = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    if (!parsed || typeof parsed !== 'object') return emptyCache();
    if (!parsed.authors || typeof parsed.authors !== 'object') {
      return { version: 1, authors: {} };
    }
    return parsed;
  } catch {
    return emptyCache();
  }
}

export function getCachedAuthorVoice(key) {
  if (!key) return null;
  const entry = readAuthorVoiceCache().authors[key];
  if (!entry || typeof entry !== 'object') return null;
  return entry;
}

export function writeCachedAuthorVoice(key, entry) {
  if (!key || !entry) return;
  const data = readAuthorVoiceCache();
  data.version = 1;
  data.authors = data.authors || {};
  data.authors[key] = {
    ...entry,
    trusted: Boolean(entry.trusted),
    updatedAt: new Date().toISOString(),
  };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${CACHE_PATH}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(tmp, CACHE_PATH);
}
