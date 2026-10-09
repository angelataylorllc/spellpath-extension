import {
  SPELLPATH_STORY_SESSION_HEADER,
  validateStorySession,
} from './abuseGuards.js';

/**
 * Metered consumers must present a session id issued by /api/scaffold.
 */
export function createRequireStorySessionMiddleware() {
  return (req, res, next) => {
    if (!req.spellpathBilling?.metered) return next();

    const sub = req.spellpathUser?.sub;
    const sessionId = req.headers[SPELLPATH_STORY_SESSION_HEADER];
    const result = validateStorySession(sub, sessionId);

    if (!result.ok) {
      return res.status(403).json({
        error: result.message,
        code: result.code,
      });
    }

    req.spellpathStorySession = { id: String(sessionId).trim() };
    return next();
  };
}
