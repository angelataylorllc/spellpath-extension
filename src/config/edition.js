/** Friend zip shows Settings + sends BYOK headers. Store zip does not. */
export const EDITION = String(import.meta.env.VITE_EDITION || 'byok').toLowerCase();
export const IS_BYOK = EDITION !== 'consumer';
export const IS_CONSUMER = EDITION === 'consumer';
