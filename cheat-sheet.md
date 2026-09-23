# SpellPath — local dev cheat sheet

## Start a session

**Terminal 1 — backend (real AI)**

```bash
cd /home/angela/Desktop/code/spellpath/spellpath-extension
npm run api
```

Runs at `http://localhost:4000`. One API for both editions. Friend zip: key in **Settings**. Consumer zip: `ANTHROPIC_API_KEY` in `.env`.

**Terminal 2 — build both editions against localhost**

```bash
cd /home/angela/Desktop/code/spellpath/spellpath-extension
npm run build:local
npm run build:local:consumer
```

Prod (hits `https://api.spellpath.app`): `npm run build:byok` and `npm run build:consumer`. Those overwrite the same two folders.

**Chrome — load both**

1. Open `chrome://extensions`
2. Developer mode **on**
3. **Load unpacked** → `dist-byok` (named SpellPath Friends) and `dist-consumer` (named SpellPath)
4. Pin the one you are testing

---

## After UI/code changes

```bash
npm run build:local            # friends
npm run build:local:consumer   # public
```

Then **Reload** that edition on `chrome://extensions`. Restart `npm run api` only if you changed server files.

---

## Stop for the day

**Backend:** In Terminal 1, press **`Ctrl+C`** to stop `npm run api`.

**Extension:** No need to unload it. Optional: disable it on `chrome://extensions` if you want it out of the way.

**Chrome:** Closing the browser does not stop the backend — only `Ctrl+C` in the API terminal does.

---

## Optional shortcuts

- **No API:** Skip `npm run api` and you can still open the popup and walk intake. If `/api/intake` is down, intake falls back to mock questions. **Scaffold and beats need the API** — they do not mock.
- **`npm run dev`:** Vite dev server only; does **not** replace loading `dist-byok/` or `dist-consumer/` in Chrome.
- **First time on a machine:** Run `npm install` once in `spellpath-extension/`.
