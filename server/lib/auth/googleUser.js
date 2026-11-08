import { normalizeEmail } from './config.js';

const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export class AuthError extends Error {
  /** @param {number} status */
  constructor(message, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

/**
 * Store vs Friends is which Chrome OAuth client issued the token (`aud` / `azp`).
 * A request header cannot choose this.
 *
 * @param {{ consumerClientIds?: Set<string>, byokClientIds?: Set<string> }} config
 * @param {{ aud?: string, azp?: string }} tokenInfo
 * @returns {'consumer' | 'byok' | null}
 */
export function editionForAudience(config, tokenInfo) {
  const consumer = config.consumerClientIds || new Set();
  const byok = config.byokClientIds || new Set();
  if (consumer.size === 0 && byok.size === 0) return null;

  const ids = [tokenInfo?.aud, tokenInfo?.azp]
    .map((id) => String(id || '').trim())
    .filter(Boolean);

  // An ID listed on both sides is treated as consumer (the Store client is the
  // one that historically also lived in VITE_GOOGLE_OAUTH_CLIENT_ID).
  if (ids.some((id) => consumer.has(id))) return 'consumer';
  if (ids.some((id) => byok.has(id))) return 'byok';
  throw new AuthError('Token was not issued to a SpellPath app', 401);
}

/**
 * Verify a Google OAuth access token and return profile fields plus edition.
 * @param {string} accessToken
 * @param {{ consumerClientIds?: Set<string>, byokClientIds?: Set<string> }} [config]
 * @param {{ fetchImpl?: typeof fetch }} [io]
 */
export async function fetchGoogleUser(accessToken, config = {}, io = {}) {
  const token = String(accessToken || '').trim();
  if (!token) throw new AuthError('Sign in required', 401);

  const fetchImpl = io.fetchImpl || fetch;
  const tokenRes = await fetchImpl(TOKENINFO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ access_token: token }),
  });

  if (!tokenRes.ok) {
    throw new AuthError('Invalid or expired Google sign-in', 401);
  }

  const tokenInfo = await tokenRes.json();
  const edition = editionForAudience(config, tokenInfo);

  const userRes = await fetchImpl(USERINFO_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const profile = userRes.ok ? await userRes.json() : {};
  const email = normalizeEmail(profile.email || tokenInfo.email);
  if (!email) throw new AuthError('Google account has no email', 401);

  return {
    email,
    name: String(profile.name || '').trim(),
    picture: String(profile.picture || '').trim(),
    sub: String(profile.sub || tokenInfo.sub || '').trim(),
    edition,
  };
}

/**
 * @param {import('./config.js').getAuthConfig extends () => infer R ? R : never} config
 * @param {{ email: string, edition?: 'consumer' | 'byok' | null }} user
 */
export function assertAllowlisted(config, user) {
  if (!config.authRequired) return;

  // Token was issued to the Store / unpacked-consumer Chrome OAuth client.
  if (user.edition === 'consumer') return;

  // Public signup opens the door to any Google account; billing decides what
  // they may actually generate.
  if (config.publicSignup) return;

  if (config.allowlist.size === 0) {
    throw new AuthError('Server invite list is not configured yet', 503);
  }

  if (!config.allowlist.has(normalizeEmail(user.email))) {
    throw new AuthError(`This Google account is not on the invite list (${user.email})`, 403);
  }
}
