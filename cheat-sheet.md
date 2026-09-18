# SpellPath — local dev cheat sheet

## Start a session

**Terminal 1 — backend (real AI)**

```bash
cd /home/angela/Desktop/code/spellpath/spellpath-extension
npm run api
```

Runs at `http://localhost:4000`. Needs `.env` (platform key and/or allowlist) plus a key in **Settings** if you use BYOK.

**Terminal 2 — build extension against localhost**

```bash
cd /home/angela/Desktop/code/spellpath/spellpath-extension
npm run build:local
```

`npm run build` / `build:byok` compile against **production** (`https://api.spellpath.app`). Use those only when that host is live.

**Chrome — load extension**

1. Open `chrome://extensions`
2. Developer mode **on**
3. **Load unpacked** → select `spellpath-extension/dist/`
4. Pin the extension, click its icon to open the popup

---

## After UI/code changes

```bash
npm run build:local
```

Then **Reload** the extension on `chrome://extensions`. Restart `npm run api` only if you changed server files.

---

## Stop for the day

**Backend:** In Terminal 1, press **`Ctrl+C`** to stop `npm run api`.

**Extension:** No need to unload it. Optional: disable it on `chrome://extensions` if you want it out of the way.

**Chrome:** Closing the browser does not stop the backend — only `Ctrl+C` in the API terminal does.

---

## Optional shortcuts

- **No API:** Skip `npm run api` and you can still open the popup and walk intake. If `/api/intake` is down, intake falls back to mock questions. **Scaffold and beats need the API** — they do not mock.
- **`npm run dev`:** Vite dev server only; does **not** replace loading `dist/` in Chrome.
- **First time on a machine:** Run `npm install` once in `spellpath-extension/`.
