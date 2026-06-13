# SpellPath — local dev cheat sheet

## Start a session

**Terminal 1 — backend (real AI)**

```bash
cd /home/angela/Desktop/code/spellpath/spellpath-extension
npm run api
```

Runs at `http://localhost:4000`. Needs `.env` with `OPENAI_API_KEY`.

**Terminal 2 — build extension**

```bash
cd /home/angela/Desktop/code/spellpath/spellpath-extension
npm run build
```

**Chrome — load extension**

1. Open `chrome://extensions`
2. Developer mode **on**
3. **Load unpacked** → select `spellpath-extension/dist/`
4. Pin the extension, click its icon to open the popup

---

## After UI/code changes

```bash
npm run build
```

Then **Reload** the extension on `chrome://extensions`.

---

## Stop for the day

**Backend:** In Terminal 1, press **`Ctrl+C`** to stop `npm run api`.

**Extension:** No need to unload it. Optional: disable it on `chrome://extensions` if you want it out of the way.

**Chrome:** Closing the browser does not stop the backend — only `Ctrl+C` in the API terminal does.

---

## Optional shortcuts

- **UI-only, no API cost:** Skip `npm run api` — the app uses mock content.
- **`npm run dev`:** Vite dev server only; does **not** replace loading `dist/` in Chrome.
- **First time on a machine:** Run `npm install` once in `spellpath-extension/`.
