const STORAGE_KEY = 'spellpathAuthUser';

export const AUTH_REQUIRED = import.meta.env.VITE_AUTH_REQUIRED !== 'false';
export const GOOGLE_OAUTH_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '').trim();

export function isAuthEnabled() {
  return AUTH_REQUIRED && Boolean(GOOGLE_OAUTH_CLIENT_ID);
}

export function getAuthConfigError() {
  if (!AUTH_REQUIRED) return null;
  if (!GOOGLE_OAUTH_CLIENT_ID) {
    return 'Google OAuth client ID missing — set VITE_GOOGLE_OAUTH_CLIENT_ID in .env.production and rebuild.';
  }
  if (!globalThis.chrome?.identity?.getAuthToken) {
    return 'Google sign-in requires the SpellPath Chrome extension (identity API).';
  }
  return null;
}

function runtimeError() {
  const err = globalThis.chrome?.runtime?.lastError;
  return err?.message || 'Google sign-in failed';
}

/**
 * @param {boolean} interactive
 * @returns {Promise<string>}
 */
export function getGoogleAccessToken(interactive) {
  return new Promise((resolve, reject) => {
    if (!globalThis.chrome?.identity?.getAuthToken) {
      reject(new Error('Chrome identity API unavailable'));
      return;
    }

    globalThis.chrome.identity.getAuthToken({ interactive }, token => {
      if (globalThis.chrome.runtime.lastError) {
        reject(new Error(runtimeError()));
        return;
      }
      if (!token) {
        reject(new Error('No Google token returned'));
        return;
      }
      resolve(token);
    });
  });
}

export async function clearGoogleSession() {
  if (!globalThis.chrome?.identity?.getAuthToken) return;

  const token = await getGoogleAccessToken(false).catch(() => null);
  if (token) {
    await new Promise(resolve => {
      globalThis.chrome.identity.removeCachedAuthToken({ token }, () => resolve());
    });
  }

  await globalThis.chrome.storage.local.remove(STORAGE_KEY);
}

/** @returns {Promise<string|null>} */
export async function getAuthorizationHeader() {
  if (!isAuthEnabled()) return null;
  const token = await getGoogleAccessToken(false).catch(() => null);
  return token ? `Bearer ${token}` : null;
}

/**
 * @param {string} apiBase
 * @param {string} token
 */
export async function fetchAuthMe(apiBase, token) {
  const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `Sign-in check failed (${res.status})`);
    err.status = res.status;
    err.code = body.code;
    throw err;
  }

  return body;
}

/** @returns {Promise<object|null>} */
export async function loadCachedUser() {
  if (!globalThis.chrome?.storage?.local) return null;
  const stored = await globalThis.chrome.storage.local.get(STORAGE_KEY);
  return stored[STORAGE_KEY] || null;
}

/** @param {object|null} user */
export async function cacheUser(user) {
  if (!globalThis.chrome?.storage?.local) return;
  if (user) {
    await globalThis.chrome.storage.local.set({ [STORAGE_KEY]: user });
  } else {
    await globalThis.chrome.storage.local.remove(STORAGE_KEY);
  }
}
