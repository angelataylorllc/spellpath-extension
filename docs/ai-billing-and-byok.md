# AI billing: platform (A) + optional BYOK (C)

SpellPath supports **OpenAI**, **Anthropic (Claude)**, and **Google Gemini**.

Each provider can use:
- **Platform key** — your server `.env` (you pay, meter & cap for a paid product)
- **BYOK** — user's key from extension Settings (they pay)

## How routing works

| Mode | When | Who pays |
|------|------|----------|
| **Platform** | No BYOK key in Settings; server has platform key for selected provider | You |
| **BYOK** | User saved provider + key in Settings | End user |

Resolution: `server/lib/llm/resolveProvider.js` (`resolveLLMForRequest`).

**Precedence:** If BYOK is allowed and `X-SpellPath-Api-Key` is set, that key is used for `X-SpellPath-Provider` (default `openai`). Legacy header `X-SpellPath-OpenAI-Key` still works for OpenAI-only clients.

## Server environment

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Platform OpenAI key |
| `ANTHROPIC_API_KEY` | Platform Anthropic key |
| `GEMINI_API_KEY` or `GOOGLE_API_KEY` | Platform Gemini key |
| `SPELLPATH_ALLOW_BYOK` | Default `true`. Set `false` for platform-only hosting. |
| `SPELLPATH_USAGE_LOG` | Set `1` / `true` to log usage (route, provider, model, tokens). |

## Default models

| Provider | Default alias | Notes |
|----------|---------------|-------|
| OpenAI | `gpt-4o-mini` | Product name; stable across minor updates |
| Anthropic | `claude-haiku-4-5` | **Alias** (no date) — Anthropic updates the snapshot it points to |
| Gemini | `gemini-2.0-flash` | Google model id |

### Model selection strategy

Providers do **not** offer a single "always latest" endpoint — you pick a **tier** (Haiku / mini / flash = fast & cheap). Within that tier:

- **Use aliases** like `claude-haiku-4-5`, not dated snapshots like `claude-3-5-haiku-20241022`. Dated ids get retired and cause 404s.
- **Env override** — set `SPELLPATH_ANTHROPIC_MODEL` (or `_OPENAI_` / `_GEMINI_`) in `.env` to pin or switch without code changes.
- **Anthropic fallback** — if the primary alias 404s, the server tries the next alias in `ANTHROPIC_MODEL_FALLBACKS` automatically.

When Anthropic renames a tier (e.g. 3.5 Haiku → 4.5 Haiku), update the alias in `server/lib/llm/providers.js` once — or set `SPELLPATH_ANTHROPIC_MODEL` locally until we ship an update.

## Extension (BYOK)

- Credentials stored in `chrome.storage.local` as `spellpath_llm_credentials`:
  ```json
  { "activeProvider": "anthropic", "keys": { "openai": "sk-…", "anthropic": "sk-ant-…" } }
  ```
  One key per provider; switch **active provider** in Settings to choose which runs stories.
- Legacy single-key format is migrated automatically on read.
- `src/services/apiCredentials.js` — get/set/clear credentials.
- `src/services/contentApi.js` sends `X-SpellPath-Provider` + `X-SpellPath-Api-Key` on every API POST when configured.
- **Settings** UI — pick provider, paste key, Save.

## Architecture

```
Extension → POST /api/* → callLLM() → provider adapter → parseModelJson → normalize*
```

Adapters: `server/lib/llm/adapters/{openai,anthropic,gemini}.js`

## Health check

`GET /api/health` returns `providers.openai|anthropic|gemini` with `platformKeyConfigured` and `defaultModel`.

## Security notes

- **HTTPS in production** for any traffic carrying API keys in headers.
- Never log header values or store platform keys in the extension.
