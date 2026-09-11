function parseBool(value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return !['0', 'false', 'no'].includes(String(value).toLowerCase());
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * @returns {{ authRequired: boolean, allowlist: Set<string> }}
 */
export function getAuthConfig() {
  // Default false so local `npm run api` keeps working; set true on prod server.
  const authRequired = parseBool(process.env.SPELLPATH_AUTH_REQUIRED, false);
  const raw = String(process.env.SPELLPATH_ALLOWLIST || '');
  const allowlist = new Set(
    raw
      .split(/[,;\s]+/)
      .map(normalizeEmail)
      .filter(Boolean),
  );

  return { authRequired, allowlist };
}

export { normalizeEmail };
