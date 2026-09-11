import { getAuthConfig } from './config.js';
import { assertAllowlisted, AuthError, fetchGoogleUser } from './googleUser.js';

export const SPELLPATH_AUTH_HEADER = 'authorization';

function parseBearerToken(req) {
  const header = String(req.headers[SPELLPATH_AUTH_HEADER] || '').trim();
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
}

/**
 * Attach req.spellpathUser when a valid allowlisted token is present.
 * Does not reject missing/invalid tokens.
 */
export function createOptionalAuthMiddleware(config = getAuthConfig()) {
  return async (req, _res, next) => {
    if (!config.authRequired) return next();

    const token = parseBearerToken(req);
    if (!token) return next();

    try {
      const user = await fetchGoogleUser(token);
      assertAllowlisted(config, user);
      req.spellpathUser = user;
    } catch {
      // ignore — requireAuth handles enforcement on protected routes
    }

    return next();
  };
}

/**
 * Reject unauthenticated or non-allowlisted requests when auth is enabled.
 */
export function createRequireAuthMiddleware(config = getAuthConfig()) {
  return async (req, res, next) => {
    if (!config.authRequired) return next();

    const token = parseBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Sign in required', code: 'auth_required' });
    }

    try {
      const user = await fetchGoogleUser(token);
      assertAllowlisted(config, user);
      req.spellpathUser = user;
      return next();
    } catch (err) {
      const status = err instanceof AuthError ? err.status : 401;
      const message = err instanceof Error ? err.message : 'Authentication failed';
      const payload = {
        error: message,
        code: status === 403 ? 'not_allowlisted' : 'auth_failed',
      };
      if (status === 403 && err?.email) payload.email = err.email;
      return res.status(status).json(payload);
    }
  };
}
