/** Matches the store consumer Chrome build (`VITE_EDITION=consumer`). */
export const SPELLPATH_EDITION_HEADER = 'x-spellpath-edition';

/** @param {import('express').Request} req */
export function isConsumerEdition(req) {
  return String(req.headers[SPELLPATH_EDITION_HEADER] || '').trim().toLowerCase() === 'consumer';
}
