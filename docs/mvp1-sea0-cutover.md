# MVP1 — sea0 cutover checklist

Run on **your laptop** and on **sea0** (`ssh angela@wp.c9h.org`). Do not commit live Stripe or Anthropic keys.

## 1. Code on sea0 (after `bfd5723` or later)

```bash
ssh angela@wp.c9h.org
bash ~/spellpath-extension/scripts/sea0-deploy.sh
```

Or manually: `git pull`, set `SPELLPATH_DB_PATH`, `nvm use 24`, `pm2 restart spellpath-api`.

Expected: `GET https://api.spellpath.app/api/health` → `{"ok":true}` (minimal health).

## 2. Database path + backup

In `~/spellpath-extension/.env`:

```bash
SPELLPATH_DB_PATH=/home/angela/spellpath-data/spellpath.db
```

Cron example (daily 3am):

```bash
0 3 * * * SPELLPATH_DB_PATH=/home/angela/spellpath-data/spellpath.db /home/angela/spellpath-extension/scripts/backup-spellpath-db.sh /home/angela/backups
```

## 3. Live Stripe (when brochure is live)

1. Stripe Dashboard → **live** mode → Products/prices (same $5/20, $10/50 as test).
2. Developers → Webhooks → endpoint `https://api.spellpath.app/api/billing/webhook`  
   Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`.
3. On sea0 `.env` (live values only):

   - `STRIPE_SECRET_KEY=sk_live_…`
   - `STRIPE_WEBHOOK_SECRET=whsec_…`
   - `STRIPE_PRICE_BASIC=price_…`
   - `STRIPE_PRICE_PLUS=price_…`
   - `STRIPE_PAYMENT_LINK_BASIC` / `STRIPE_PAYMENT_LINK_PLUS` — Payment links for [landing/index.html](../landing/index.html) plan cards
   - `SPELLPATH_CHECKOUT_RETURN_URL=https://spellpath.app`

4. `pm2 restart spellpath-api` and send a test checkout (small plan, real card, cancel in portal).

## 4. Platform AI + public signup (last)

Only after Stripe webhook verified:

- `ANTHROPIC_API_KEY=sk-ant-…` on sea0
- `SPELLPATH_PUBLIC_SIGNUP=true`
- Friends track unchanged: allowlist still works; friends stay BYOK-only unless `SPELLPATH_PLATFORM_FOR_ALLOWLIST=true`.

## 5. Consumer extension

Laptop:

```bash
npm run build:consumer
```

Load **`dist-consumer/`** in Chrome (public Store build when listing). Requires `storySessionId` from API for metered beats.

## 6. Friends BYOK

No consumer rebuild required for friends. **`git pull` on sea0** still updates API (health + abuse guards; friends unaffected).
