function parseBool(value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return !['0', 'false', 'no'].includes(String(value).toLowerCase());
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function splitIds(raw) {
  return String(raw || '')
    .split(/[,;\s]+/)
    .map((id) => id.trim())
    .filter(Boolean);
}

function clientIdSet(env, keys) {
  const ids = new Set();
  for (const key of keys) {
    for (const id of splitIds(env[key])) ids.add(id);
  }
  return ids;
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{
 *   authRequired: boolean,
 *   allowlist: Set<string>,
 *   publicSignup: boolean,
 *   consumerClientIds: Set<string>,
 *   byokClientIds: Set<string>,
 * }}
 */
export function getAuthConfig(env = process.env) {
  // Default false so local `npm run api` keeps working; set true on prod server.
  const authRequired = parseBool(env.SPELLPATH_AUTH_REQUIRED, false);
  const raw = String(env.SPELLPATH_ALLOWLIST || '');
  const allowlist = new Set(
    raw
      .split(/[,;\s]+/)
      .map(normalizeEmail)
      .filter(Boolean),
  );

  // Off until the paid tier ships, so today the invite list is still the door.
  const publicSignup = parseBool(env.SPELLPATH_PUBLIC_SIGNUP, false);

  // Edition comes from the token's OAuth client (aud/azp), not X-SpellPath-Edition.
  const consumerClientIds = clientIdSet(env, [
    'SPELLPATH_OAUTH_CLIENT_IDS_CONSUMER',
    'VITE_GOOGLE_OAUTH_CLIENT_ID_CONSUMER',
    'VITE_GOOGLE_OAUTH_CLIENT_ID_CONSUMER_UNPACKED',
  ]);
  const byokClientIds = clientIdSet(env, [
    'SPELLPATH_OAUTH_CLIENT_IDS_BYOK',
    'VITE_GOOGLE_OAUTH_CLIENT_ID_BYOK',
    'VITE_GOOGLE_OAUTH_CLIENT_ID_BYOK_UNPACKED',
    'VITE_GOOGLE_OAUTH_CLIENT_ID_BYOK_SHARE',
  ]);

  return { authRequired, allowlist, publicSignup, consumerClientIds, byokClientIds };
}

export { normalizeEmail };
