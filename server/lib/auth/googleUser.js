import { normalizeEmail } from './config.js';

export class AuthError extends Error {
  /** @param {number} status */
  constructor(message, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

/**
 * Verify a Google OAuth access token and return profile fields.
 * @param {string} accessToken
 */
export async function fetchGoogleUser(accessToken) {
  const token = String(accessToken || '').trim();
  if (!token) throw new AuthError('Sign in required', 401);

  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new AuthError('Invalid or expired Google sign-in', 401);
  }

  const data = await res.json();
  const email = normalizeEmail(data.email);
  if (!email) throw new AuthError('Google account has no email', 401);

  return {
    email,
    name: String(data.name || '').trim(),
    picture: String(data.picture || '').trim(),
    sub: String(data.sub || '').trim(),
  };
}

/**
 * @param {import('./config.js').getAuthConfig extends () => infer R ? R : never} config
 * @param {{ email: string }} user
 */
export function assertAllowlisted(config, user) {
  if (!config.authRequired) return;

  if (config.allowlist.size === 0) {
    throw new AuthError('Server invite list is not configured yet', 503);
  }

  if (!config.allowlist.has(normalizeEmail(user.email))) {
    throw new AuthError(`This Google account is not on the invite list (${user.email})`, 403);
  }
}
