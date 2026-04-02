# AI billing: platform (A) + optional BYOK (C)

SpellPath can use **your server’s OpenAI key** (paid product / your quota) or **the user’s key** (BYOK — bill hits their OpenAI account). The code is structured so you can start with **A** and add **C** without a rewrite.

## How routing works

| Mode | When | Who pays OpenAI |
|------|------|------------------|
| **Platform** | Request has no `X-SpellPath-OpenAI-Key` and `OPENAI_API_KEY` is set on the server | You (meter & cap this) |
| **BYOK** | Request includes `X-SpellPath-OpenAI-Key` and `SPELLPATH_ALLOW_BYOK` is not disabled | End user |

Resolution lives in `server/lib/aiProvider.js` (`resolveOpenAIForRequest`).

**Precedence:** If BYOK is allowed and `X-SpellPath-OpenAI-Key` is non-empty, that key is used (even when a platform key exists). Otherwise the platform key is used.

## Server environment

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Platform key (mode A). Required for requests that do not send BYOK. |
| `SPELLPATH_ALLOW_BYOK` | Default `true`. Set to `false` or `0` on a locked-down deploy to **ignore** BYOK headers (platform only). |
| `SPELLPATH_USAGE_LOG` | Set to `1` / `true` to log structured usage lines (route + `billingSource` + token counts). No payloads or keys logged. |

## Metering (future quotas)

`server/lib/usageMeter.js` → `recordOpenAIUsage()` runs after each successful completion. It receives:

- `route`: `intake` | `scaffold` | `beat` | `generate`
- `billingSource`: `platform` | `byok`
- `promptTokens`, `completionTokens`, `totalTokens` (from the API when available)

**Next steps for a paid service:** for `billingSource === 'platform'`, attach user/session id (auth), persist totals, enforce plan limits before calling OpenAI, and integrate billing. BYOK calls can skip your quota or use a lighter “software only” tier.

## Extension (BYOK)

- Optional key is read from `chrome.storage.local` under `spellpath_user_openai_key`.
- `src/services/apiCredentials.js` — `getOptionalUserOpenAIKey`, `setUserOpenAIKey`, `clearUserOpenAIKey`.
- `src/services/contentApi.js` sends `X-SpellPath-OpenAI-Key` on every API POST when a key is stored.
- `extension/manifest.json` includes the `storage` permission.

There is **no Options UI yet**; you can set the key from the extension console for testing:

```js
chrome.storage.local.set({ spellpath_user_openai_key: 'sk-...' });
```

Remove BYOK for testing platform mode:

```js
chrome.storage.local.remove('spellpath_user_openai_key');
```

## CORS

The API allows the BYOK header in `Access-Control-Allow-Headers` so browser/extension `fetch` preflights succeed.

## Health check

`GET /api/health` returns:

- `platformKeyConfigured` — boolean
- `byokAllowed` — reflects `SPELLPATH_ALLOW_BYOK`

## Security notes

- **HTTPS in production** for any traffic carrying `X-SpellPath-OpenAI-Key`.
- Never log header values or store platform keys in the extension.
- Rotating a leaked user key is the user’s responsibility; rotating your platform key is yours.
