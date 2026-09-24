# AI billing: platform (A) + optional BYOK (C)

SpellPath supports **OpenAI**, **Anthropic (Claude)**, and **Google Gemini**.

Each provider can use:
- **Platform key** — your server `.env` (you pay, meter & cap for a paid product)
- **BYOK** — user's key from extension Settings (they pay)

## How routing works

| Mode | When | Who pays |
|------|------|----------|
| **Platform** | No BYOK key, and billing says the account is entitled | You |
| **BYOK** | User saved provider + key in Settings | End user |

Resolution: `server/lib/llm/resolveProvider.js` (`resolveLLMForRequest`).

**Precedence:** If BYOK is allowed and `X-SpellPath-Api-Key` is set, that key is used for `X-SpellPath-Provider` (default `openai`). Legacy header `X-SpellPath-OpenAI-Key` still works for OpenAI-only clients.

**The platform key fails closed.** `resolveLLMForRequest` only hands out a platform key when `req.spellpathBilling.allowPlatformKey` is true, which only `server/lib/billing/middleware.js` sets. A request that never passed through billing gets no key, even if one is configured.

| Caller | `mode` | Platform key | Metered |
|--------|--------|--------------|---------|
| Local dev (`SPELLPATH_AUTH_REQUIRED=false`) | `local` | yes | no |
| Anyone sending their own key | `byok` | no | no |
| Allowlisted friend, no key | `friend` | no | no |
| Public learner (needs `SPELLPATH_PUBLIC_SIGNUP`) | `consumer` | yes | yes |
| Signed in but nothing enables them | `blocked` | no | no |

## Paid consumer tier

**A story is one scaffold.** Beats inside a story are not metered again, so a
learner is never cut off mid-story.

- **3 free stories, lifetime** (`SPELLPATH_FREE_STORIES`), then $5 / 20 per month or $10 / 50 per month.
- Quota is reserved *before* generation and refunded if the scaffold fails, so a server error costs the learner nothing.
- Subscription allowance is spent before free credits, so a cancelling subscriber still has their free stories.

### Where it lives

| File | Role |
|------|------|
| `server/lib/billing/plans.js` | Tiers, caps, Stripe price mapping |
| `server/lib/billing/store.js` | SQLite: accounts, counters, Stripe IDs, event de-dup |
| `server/lib/billing/middleware.js` | Who may spend the key; reserves a story on `/api/scaffold` |
| `server/lib/billing/stripe.js` | Checkout, billing portal, webhook handling |

### The user store

SQLite via the built-in `node:sqlite`, so there is nothing to compile and no
database server to run. **This requires Node 22+; Node 24 is what we run.** On
Node 20 the server will not even start.

Point `SPELLPATH_DB_PATH` at a directory **outside the repo** on the server so
a deploy can never wipe accounts. Back it up like any other money record:

```bash
sqlite3 "$SPELLPATH_DB_PATH" ".backup '/home/angela/backups/spellpath-$(date +%F).db'"
```

### Stripe

Angela is the seller of record; the Chrome Web Store takes no cut. Checkout
opens in a normal tab because an extension popup cannot host Stripe.

Webhook endpoint: `POST /api/billing/webhook`. It is mounted **before**
`express.json()` because Stripe signs the raw bytes. Events are recorded by ID,
so a redelivery is ignored — and if handling throws, the ID is released so the
retry still works.

Events consumed: `checkout.session.completed`, `customer.subscription.*`,
`invoice.paid` (resets the month), `invoice.payment_failed` (marks past due).

## Server environment

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Platform OpenAI key |
| `ANTHROPIC_API_KEY` | Platform Anthropic key |
| `GEMINI_API_KEY` or `GOOGLE_API_KEY` | Platform Gemini key |
| `SPELLPATH_ALLOW_BYOK` | Default `true`. Set `false` for platform-only hosting. |
| `SPELLPATH_USAGE_LOG` | Set `1` / `true` to log usage (route, provider, model, tokens). |
| `SPELLPATH_PUBLIC_SIGNUP` | Default `false`. Turn on to let any Google account in (MVP1). |
| `SPELLPATH_PLATFORM_FOR_ALLOWLIST` | Default `false`. Lets your own allowlisted account test the paid flow. |
| `SPELLPATH_FREE_STORIES` | Default `3`. Lifetime free stories. |
| `SPELLPATH_DB_PATH` | User store location. **Keep it outside the repo on the server.** |
| `STRIPE_SECRET_KEY` | Test key locally, live key on the server. |
| `STRIPE_WEBHOOK_SECRET` | From the Stripe CLI locally, from the dashboard endpoint in production. |
| `STRIPE_PRICE_BASIC` / `STRIPE_PRICE_PLUS` | Recurring price IDs for $5/20 and $10/50. |
| `SPELLPATH_CHECKOUT_RETURN_URL` | Where Stripe sends the learner afterwards. |

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
