import { getAuthConfig } from './auth/config.js';

/** Loopback by default so only the local reverse proxy can reach Node. */
export function listenHost(env = process.env) {
  return String(env.HOST || '').trim() || '127.0.0.1';
}

/**
 * Production must not boot as an unauthenticated platform-key proxy.
 * @param {NodeJS.ProcessEnv} [env]
 */
export function assertProductionBoot(env = process.env) {
  if (String(env.NODE_ENV || '') !== 'production') return;
  const { authRequired } = getAuthConfig(env);
  if (authRequired) return;
  throw new Error(
    'Refusing to start: NODE_ENV=production requires SPELLPATH_AUTH_REQUIRED=true',
  );
}
