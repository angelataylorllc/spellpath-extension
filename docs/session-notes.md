# SpellPath — Session Notes

Living doc for project status across sessions. Read this at the start of a new session before diving in.

---

## Release plan (current — Sept 2026)

Three release tracks, **one hosted API** (`api.spellpath.app`), **one codebase**.

| Track | Goal | Distribution | AI billing | ~% complete |
|-------|------|--------------|------------|-------------|
| **1. Friend (private BYOK)** | Tech friends try without hitting your LLM bill | Unlisted Chrome link or zip | Their API keys | **~83%** |
| **2. MVP1 (public extension)** | Paying users via Chrome Web Store | Public Web Store | Your keys + Stripe | **~45%** |
| **3. MVP2 (web app)** | Same product at `spellpath.app`, mobile-friendly | Browser URL (+ optional PWA) | Same as MVP1 | **~20%** |

### Build order

1. **Friend BYOK** — host API + Google allowlist + private `VITE_EDITION=byok` build  
2. **MVP1 public** — Stripe + consumer build + Store listing  
3. **MVP2 web app** — deploy UI + responsive layout  

### Product / billing decisions (locked for now)

- **Domain:** `spellpath.app` renewed (~$23/yr). `spellpath.com` not owned (premium aftermarket — skip).
- **Public pricing:** **$10/mo**, **~10 stories/month**, **1 free story** before subscribe (no card).
- **Auth:** Google sign-in required before any story (public + allowlisted friends).
- **Public AI:** Platform keys on server (Anthropic Haiku default); BYOK hidden in consumer build.
- **Friend AI:** Same hosted API; allowlisted emails + BYOK headers; no Stripe; private extension build with Settings visible.
- **Hosting:** CJ server **sea0** — see **Hosting (CJ)** below. Old `192.53.112.85` (angelataylorllc.com DNS) dead. Squarespace = DNS/registrar only.

### Hosting (CJ) — Sept 2026

```text
wp.c9h.org  →  CNAME  sea0.c9h.org  →  A  172.232.172.101
```

| Item | Value |
|------|--------|
| **Hostname** | `wp.c9h.org` (CJ’s; points at `sea0.c9h.org`) |
| **IP** | `172.232.172.101` (Linode/Akamai range) |
| **Web server** | Apache 2.4.59 (Debian) — default placeholder page today |
| **HTTPS** | Works on `https://wp.c9h.org` |

**SpellPath API hostname (chosen):** **`api.spellpath.app`**

| Who | Task |
|-----|------|
| **Angela** | DNS A record: `api.spellpath.app` → `172.232.172.101` (Squarespace/registrar) |
| **CJ** | Apache vhost + Let’s Encrypt for `api.spellpath.app`; reverse-proxy → Node `:4000` on localhost |
| **Angela** | Deploy app; prod builds use `.env.production` → `VITE_API_BASE` |

**CJ status (Sept 10):** Agreed to `api.spellpath.app` vhost + TLS + proxy → `:4000` + SSH. Busy; likely **tomorrow** after current task.

**Still need from CJ:** SSH/sudo access, Node.js 18+, process manager (pm2/systemd), firewall (443 public; Node localhost only).

### Build #1 — Friend BYOK (full task list)

**Goal:** Allowlisted friends install a private extension, sign in with Google, paste their own API keys, hit **`https://api.spellpath.app`** (or interim hostname — change one line in `.env.production` and rebuild).

| # | Task | Status | Notes |
|---|------|--------|-------|
| **Product (learning app)** |
| 1 | Story pipeline (scaffold → beats → checkpoints) | ✅ | |
| 2 | Adaptation + remedial beats | ✅ | Visible notices in UI |
| 3 | Topic gate (`/api/validate-topic`) | ✅ | Reject / clarify / heritage |
| 4 | Genre + optional author voice | ✅ | |
| 5 | Checkpoint option shuffle | ✅ | |
| 6 | Export / narrative layout | ✅ | Session 4 |
| **BYOK (client + server)** |
| 7 | Settings: provider + key per provider | ✅ | |
| 8 | BYOK headers on all API calls | ✅ | `contentApi.js` |
| 9 | Multi-LLM adapters (OpenAI, Anthropic, Gemini) | ✅ | `server/lib/llm/` |
| 10 | Server BYOK resolution + `SPELLPATH_ALLOW_BYOK` | ✅ | Platform fallback optional |
| **Prod extension build** |
| 11 | `.env.production` → `VITE_API_BASE` | ✅ | `https://api.spellpath.app` |
| 12 | `.env.production` → `VITE_EDITION=byok` | ✅ | Env set; `consumer` hide-BYOK wiring is MVP1 |
| 13 | `npm run build:byok` → `dist/` | ✅ | Prod API URL |
| 13b | `npm run build:local` → `dist/` | ✅ | Local dev: `localhost:4000` |
| 14 | Private zip + install instructions for friends | ❌ | After API is live |
| **Hosting + deploy** |
| 15 | DNS: `api.spellpath.app` → `172.232.172.101` | ❌ | Squarespace; after CJ confirms |
| 16 | CJ: Apache vhost + TLS + proxy → `:4000` | ❌ | CJ: ~tomorrow |
| 17 | SSH + deploy Node app on sea0 | ❌ | `git clone`, `.env`, pm2/systemd |
| 18 | Prod server `.env` (BYOK on, usage log optional) | ❌ | No platform keys required for BYOK |
| **Auth + access control** |
| 19 | Google sign-in in extension | ✅ | `chrome.identity` + `LoginGate` |
| 20 | Server: email allowlist (env or file) | ✅ | `SPELLPATH_ALLOWLIST` |
| 21 | API middleware: reject unauthenticated / non-allowlisted | ✅ | `/api/*` except `/api/health` |
| 22 | Google OAuth client ID in `.env.production` | ✅ | spellpath GCP project; test users |
| 23 | Prod server `SPELLPATH_AUTH_REQUIRED=true` + allowlist | ❌ | Works locally; set on sea0 deploy |
| 24 | End-to-end sign-in tested locally | ✅ | hello@angelataylorllc.com + build:local |

**Build #1 progress:** **20 / 24 tasks done → ~83%**. **Hosting + deploy + friend zip** remain.

**Config knobs (change hostname / auth in one place):**

| File | Vars |
|------|------|
| `.env.production` | `VITE_API_BASE`, `VITE_AUTH_REQUIRED`, `VITE_GOOGLE_OAUTH_CLIENT_ID` |
| Server `.env` | `SPELLPATH_AUTH_REQUIRED`, `SPELLPATH_ALLOWLIST` |

**What's next (in order):**

1. **Optional now:** test a story locally (Settings → BYOK key → run adventure).
2. **CJ (~tomorrow):** vhost + TLS + SSH on sea0.
3. **You:** DNS A `api.spellpath.app` → `172.232.172.101`; deploy Node + prod `.env`.
4. **`npm run build:byok`**, smoke-test hosted API, zip `dist/` + short install doc for friends.

### MVP1 public — remaining (after #1)

| Task | Status |
|------|--------|
| `VITE_EDITION=consumer` — hide BYOK in UI | ❌ |
| User DB: `freeStoryUsed`, `storiesThisMonth`, subscription | ❌ |
| 1 free story gate + Stripe Checkout + webhook | ❌ |
| $10/mo / 10 stories enforcement on server | ❌ |
| Chrome Web Store + minimal `spellpath.app` landing | ❌ |

### MVP2 web app — remaining (after MVP1)

| Task | Status |
|------|--------|
| Deploy React UI to `spellpath.app` | ❌ |
| Replace `chrome.storage` with account-backed sync | ❌ |
| Responsive / mobile layout | ❌ |

### Dev reminders

```bash
cd spellpath-extension
npm run build:byok     # → dist/; uses .env.production (api.spellpath.app)
npm run api            # local API on :4000 — dev only until api.spellpath.app is live
```

Load extension from **`dist/`**, not project root. Restart API after server changes.

---

## Session 5 — Aug–Sept 2026

### Starting State

- Session 4 shipped export, narrative layout, and API hardening. User testing continued (day trading, Munroe clan, Outer Hebrides, family/mom runs).
- Product direction shifted from “extension augmenting browsing” toward **destination learning app** with hosted release in mind.

### What We Did

**1. Intake + learning goals (Phase 1–2)**

- Age ranges, shorter AI intake, `learningGoals` + `learningFocus` on home screen.
- Genre-leak filter in intake (`normalizeIntake.js`).
- Topic/goals flow through scaffold and beat prompts.

**2. Multi-LLM BYOK**

- `server/lib/llm/` — OpenAI, Anthropic, Gemini via `callLLM()`.
- Settings: provider picker + one key per provider; active provider in `apiCredentials.js`.
- Removed silent mock fallback for scaffold/beat — errors surface in UI.

**3. Adaptation + checkpoints**

- Visible adaptation notices after wrong answers; forced remedial beat after 2 misses on same concept.
- `scaffoldAdjustment` applied when beat loads (not on checkpoint submit).
- Checkpoint options **shuffled** on server so correct answer isn’t always first.
- Beat prompt: no fourth-wall “checkpoint forming” language.

**4. Topic gate**

- Client junk filter + `POST /api/validate-topic` (accept / clarify / reject).
- Heritage topics require goals; honesty note for clan/family subjects.
- UI phases: validating, reject, clarify, author-style warn.

**5. Genre voice + author style**

- `lib/genreVoice.js` — stronger genre rules in scaffold/beat payloads.
- Optional **Author voice** field (e.g. Marion Zimmer Bradley); genre compatibility check on validate.

**6. UI fix**

- Day-mode **dialogue contrast** — darker text on parchment backgrounds (mystery/adventure).

**7. Release / infra planning (not yet implemented)**

- Purchased **`spellpath.app`**. Clarified extension (Web Store) vs hosted API (CJ server / Railway).
- Dual-track plan: private BYOK friends vs public Google + Stripe.
- Pricing: $10/mo, 1 free story, Google auth prerequisite.

### Key Files (recent)

| Area | Paths |
|------|-------|
| Topic gate | `src/lib/validateTopicClient.js`, `server/lib/normalizeTopicValidation.js`, `POST /api/validate-topic` |
| Adaptation | `src/stories/adaptation.js`, `src/stories/engine.js`, `src/stories/useStory.js` |
| Genre / author | `lib/genreVoice.js`, `src/config/genreVoice.js` |
| LLM | `server/lib/llm/`, `src/services/apiCredentials.js`, `Settings.jsx` |
| Checkpoints | `server/lib/normalizeBeat.js` (shuffle) |
| Contracts | `docs/contracts/04-checkpoints.md`, `05-adaptation.md` |

### Pitfalls Learned

- **Adaptation was invisible** — prompt-only; now has UI notices + remedial beats.
- **Settings “no server key”** vs **“key saved”** — two systems (`.env` platform fallback vs BYOK in extension); both can be true.
- **Genre “Fantasy”** still read as plain history without `genreVoice` + author prompts — needs new stories to see effect.
- **Public share links** (Claude) aren’t readable by agents; paste or export for handoff.

### Current State

- **Dev:** Full story pipeline works locally (`npm run api` + extension from `dist/`).
- **Not launch-ready:** API is localhost-only; no auth, Stripe, hosted deploy, or dual extension builds.
- **Next focus:** **Friend BYOK track (#1)** — host API, Google allowlist, private build.

### Next Session — Priority

1. **Friend BYOK (release track #1)** — see table in **Release plan** above.
2. Then MVP1 public (Stripe, consumer build, Store).
3. Then MVP2 web app.

---

## Session 4 — June 14–15, 2026

### Starting State

- Session 3 left **story engine + text layout** as the next focus (typewriter, dialogue, beat flow).
- Full intake → scaffold → beat pipeline worked, but narrative presentation and export were thin.
- User loaded extension from **`dist/`** (not project root). API runs separately via `npm run api` on port 4000.

### What We Did

**1. Story narrative layout + typewriter**

- **`parseNarrativeBlocks.js`** — splits prose vs `"dialogue"` segments for rendering.
- **`lib/normalizeQuotes.js`** — converts curly/smart quotes to straight `"` (fixes inconsistent dialogue splitting).
- **`StoryBeat.jsx`** — renders `story-paragraph-group` with separate prose vs `story-dialogue-line` styles.
- **`useNarrativeReveal.js`** — slower typewriter: `CHAR_MS` 14 → 65, `PARAGRAPH_PAUSE_MS` 350 → 1400.
- **`theme-tokens.css`** — more space between paragraph groups in story card.
- **Server beat prompt** — requires straight ASCII double quotes in dialogue.

**2. Story engine persistence (for export + recap)**

- **`engine.js` `recordCheckpoint()`** — now stores full beat: `narrative`, `narrativeBlocks`, `concept`, `checkpointRecord` (question, options, hint, selected index/label, correct).
- **`useStory.js`** — passes `narrative` + `checkpoint` from `currentBeatData` into engine on submit.

**3. JSON + PDF export**

- **`storyExport.js`** — `buildSessionArchive`, `downloadStoryJson`, `openStoryPdf`, `persistSessionLog`.
- **`App.jsx`** — on journey complete: auto-save session to `chrome.storage.local` (`spellpath_session_logs`, last 50); **Download JSON** + **Download PDF** buttons.
- **PDF flow:** `openStoryPdf` → HTML in `chrome.storage.session` → `extension/print.html` + `print.js` → `document.write` + `window.print()`.
- **`manifest.json`** — added `tabs` permission; removed broken `icon.png` refs (were causing extension errors).

**4. API reliability (scaffold parse failures)**

- **`server/lib/parseModelJson.js`** — robust JSON parse (markdown fences, brace extraction, truncated-JSON repair).
- **`server.js`** — scaffold `maxTokens` 500 → 1500; retry once on parse failure; log `finish_reason`; clearer `EADDRINUSE` message.
- **`server/lib/normalizeBeat.js`** — normalize beat narrative quotes + checkpoint option labels (`label` / `text` / `option`).

**5. Client-side beat normalization**

- **`contentApi.js`** — `normalizeBeatClient()` applies quote normalization on beat responses.

**6. Pushed to GitHub**

- `905809e` — `feat(ui): Improve story narrative layout and typewriter pacing.`
- `ee96c98` — `feat: Add story export and harden API JSON parsing.`
- Repo: `github.com/angelataylorllc/spellpath-extension` (`main`)

### User Testing (exports)

**tiktok story (first PDF try)**

- Export pipeline worked, but Beat 2 was **mock fallback** text (“metal rungs…”) — beat API failed mid-session (likely API restart during generation).
- Beat 3 checkpoint showed **`undefined`** for options (model used non-`label` fields; fixed in later commit).
- Sparse page 1 + Chrome print headers (`chrome-extension://…` URL) — layout and browser setting issues.

**dataproc story (second try — healthy run)**

- All 5 beats AI-generated; 5/5 checkpoints correct.
- JSON archive complete (intake answers, learner profile, full narratives + blocks + checkpoints).
- PDF: 7 pages, checkpoints render with ✓, no `undefined`, title flows into Beat 1.
- Minor: dialogue lines still break awkwardly in PDF (quoted line on one row, attribution on next) because `narrativeBlocks` split inline dialogue into separate `<p>` tags.

### Key Files (this session)

| Area | Paths |
|------|-------|
| Narrative parsing | `src/stories/parseNarrativeBlocks.js`, `lib/normalizeQuotes.js` |
| Typewriter | `src/hooks/useNarrativeReveal.js`, `src/stories/StoryBeat.jsx` |
| Engine / hook | `src/stories/engine.js`, `src/stories/useStory.js` |
| Export | `src/stories/storyExport.js`, `extension/print.html`, `extension/print.js` |
| API | `server.js`, `server/lib/parseModelJson.js`, `server/lib/normalizeBeat.js` |
| UI | `src/components/App.jsx`, `src/styles/theme-tokens.css` |
| Extension | `extension/manifest.json` |

### Pitfalls Learned

- **Load extension from `dist/`** after `npm run build` — source changes don’t apply until rebuild + reload.
- **Don’t restart `npm run api` mid-story** — in-flight beat requests fall back to mock content; can also leave port 4000 busy (`EADDRINUSE`). Stop old process first: `fuser -k 4000/tcp`.
- **Scaffold parse errors** — often truncated JSON; fixed with higher `maxTokens` + `parseModelJson` + retry.
- **PDF via `window.open` + `document.write`** — blocked in extension context; use `print.html` + session storage instead.
- **Chrome print dialog** — turn off **Headers and footers** for cleaner PDFs (removes URL/date on every page).
- **Checkpoint option shape** — model may return `text` instead of `label`; normalize on server + engine + export.

### Current State

- End-to-end flow works: intake → scaffold → beats → complete → JSON/PDF export.
- Session logs persist locally on complete.
- API scaffold generation reliable after server restart with latest code.
- In-app story layout improved (dialogue lines, slower typewriter, paragraph spacing).
- User satisfied enough for tonight; **more story engine work wanted next session**.

### Next Session — Priority (story engine)

User explicitly wants to continue **story engine** improvements. Suggested order:

1. **Narrative quality / weaving** — beats still feel somewhat lesson-adjacent; slower emotional pacing, less repetitive settings (library/lab returns), stronger `storySoFar` continuity. See Session 2 item #1 and `docs/contracts/03-narration.md`.
2. **Adaptation loop** — wire `scaffoldAdjustment` from beat responses into engine (`adjustScaffold` exists but rarely triggered). See `docs/contracts/05-adaptation.md`.
3. **Checkpoint UX** — optional free-text reasoning; narrower question layout (Session 2 item #3).
4. **Export polish** — merge dialogue + attribution in PDF; optional beat summaries in export footer.
5. **Resilience** — surface API errors in UI instead of silent mock fallback; retry beat generation.

**Dev reminders**

```bash
npm run build          # → dist/; reload extension in chrome://extensions
npm run api            # API on localhost:4000; only one instance
```

---

## Session 3 — June 12, 2026

### Starting State

- Story engine pipeline (intake → scaffold → beat loop) was working from Session 2.
- Genre **atmospheres** were partially done: Fantasy, Sci-Fi, Mystery pushed; Horror pushed (`23bcb77`); Adventure not yet on GitHub.
- Adventure night initially looked too similar to Mystery (lamp pools + embers). User wanted a single roaring campfire instead.

### What We Did

**1. Adventure genre atmosphere (day + night)**

- **Day:** Clear sky → red-clay desert gradient (distinct from Fantasy parchment). Blazing sun + heat shimmer on `::before`. Canvas **wind** layer (`AdventureWind.jsx`, adapted from CodePen tmrDevelops/RWLbEy, slower). Soft ground shadow on `::after`.
- **Night:** Midnight blue sky → long canyon-brown gradient on `.scene__atmosphere` (authoritative base layer). Twinkling stars on `::after`. **Campfire** in bottom-left (`AdventureCampfire.jsx`, Kyle Wetton CodePen style) on separate `scene__campfire` layer (z-index 2).
- **Layer-stack fix:** `::before` had been painting a dark brown overlay on top of the base gradient, hiding edits. Restructured so gradient lives on the base element; `::before` = faint top-sky glow only; `::after` = stars only.
- Tried procedural SVG desert plants (osublake CodePen) — removed; too small/strange. Wind replaced that idea.

**2. SceneAtmosphere component**

- `SceneAtmosphere.jsx` wires atmosphere div + conditional Adventure wind (day) and campfire (night).
- `App.jsx` uses `<SceneAtmosphere />` on all six scene screens (replaces raw `<div className="scene__atmosphere" />`).

**3. Pushed to GitHub**

- Commit `569593e` on `main`: `feat(ui): Add Adventure day/night animated atmosphere.`
- Repo: `github.com/angelataylorllc/spellpath-extension`

### Genre Atmosphere Status

| Genre   | Day | Night | Notes |
|---------|-----|-------|-------|
| Fantasy | ✅  | ✅    | Pushed |
| Sci-Fi  | ✅  | ✅    | Pushed |
| Mystery | ✅  | ✅    | Pushed |
| Horror  | ✅  | ✅    | Pushed (`23bcb77`) — CSS blood streaks only; goo/SVG drips reverted |
| Adventure | ✅ | ✅  | Pushed (`569593e`) — desert/wind day; stars + campfire night |

All atmospheres: CSS-only except Adventure wind (canvas) and Adventure night campfire (DOM + clip-path flames). `prefers-reduced-motion` disables fast/blinking; slow ambient drift kept where applicable.

### Key Files (atmosphere)

- `src/styles/theme-tokens.css` — genre tokens + atmosphere gradients/pseudo-elements
- `src/components/SceneAtmosphere.jsx` — atmosphere orchestration
- `src/components/AdventureCampfire.jsx` + `src/styles/adventure-campfire.css`
- `src/components/AdventureWind.jsx` + `src/styles/adventure-wind.css`
- `src/components/App.jsx` — imports + SceneAtmosphere usage

### Pitfalls Learned

- **Horror goo/SVG DOM drips** — user saw glitches; stick to CSS pseudo-element streaks.
- **Adventure night `::before` overlay** — do not put ground/haze gradients on pseudo-elements that sit above the base sky gradient; they mask changes.
- **Campfire z-index** — needs `scene__campfire` above story cards (z-index 2) when tucked bottom-left; atmosphere stays z-index 0.

### Current State

- Full intake → story pipeline still works.
- All five genre atmospheres implemented and on `main`.
- UI polish (toolbar, intake layout, story card transparency per genre) in good shape for a v1 pass.
- User satisfied with today's atmosphere work; **UI can still be tweaked later** (colors, motion speed, campfire position, etc.) but this is solid progress.

### Next Session — Priority

**Story engine + generating text layout** (user's stated next focus):

1. **Story engine** — revisit beat generation, pacing, and how narrative/checkpoints flow (see Session 2 next steps: deeper weaving, adaptation, scaffold adjustments).
2. **Text layout while generating** — improve how story text appears during AI generation (typewriter, spacing, width, loading states) — likely `StoryBeat.jsx`, `useStory.js`, and related CSS in `theme-tokens.css` / story components.
3. *(Lower priority / future UI)* — further atmosphere tweaks, typography density, checkpoint layout width.

Refer also to `docs/contracts/03-narration.md` and `docs/contracts/04-checkpoints.md` for intended behavior.

---

## Session 2 — March 15, 2026

### Starting State

- The project had a working Chrome extension with a basic 2-question intake quiz (subject + genre selection) that called the OpenAI API to generate flat story content.
- A `StoryEngine` class existed (`src/stories/engine.js`) with graph-based navigation, but it was completely bypassed — `App.jsx` rendered AI content directly without using it.
- A hardcoded story file (`src/stories/javascript-basics.js`) and a `StoryNode.jsx` component existed as dead code from the graph-based design.
- The architecture had no scaffold, no beat-by-beat progression, no adaptive learning loop.

### What We Did

**1. Redesigned the core architecture (hybrid model)**

- Replaced the graph-based `StoryEngine` with a phase/state manager that tracks: scaffold, beat cursor, learner profile, completed beats, and story phase.
- Defined six phases: `INTAKE → SCAFFOLD → NARRATION → CHECKPOINT → ADAPTATION → COMPLETE`.
- The quiz output now generates a **scaffold** (mutable learning framework), and the story progresses through **beats** — one at a time, conversationally, adapting based on checkpoint answers.

**2. Built three new API endpoints**

- `POST /api/intake` — Generates AI-driven subject-specific quiz questions based on the learner's age, level, and motivation.
- `POST /api/scaffold` — Generates the story framework/outline with beat concepts, titles, and summaries.
- `POST /api/beat` — Generates individual narrative beats with embedded checkpoints, using accumulated context from prior beats.
- Each endpoint has a detailed system prompt and mock fallback for when the API is unavailable.

**3. Enhanced the intake quiz**

- Expanded from 2 questions to a two-stage flow: 3 universal questions (age, experience level, motivation) followed by 5-8 AI-generated subject-specific probes.
- Added support for multiple question types: `choice`, `text`, `textarea`, `fill_blank`.
- Created `IntakeQuestion.jsx` component to render all question types dynamically.

**4. Built the story beat loop**

- Created `StoryBeat.jsx` — renders narrative text and interactive multiple-choice checkpoints with correct/incorrect visual feedback and hints.
- Created `useStory.js` hook — wraps the engine and exposes reactive state and actions (`initScaffold`, `loadBeat`, `submitCheckpoint`, `continueStory`, `reset`).
- Rewrote `App.jsx` to orchestrate the full flow: input → quiz → quiz_loading → scaffolding → story → complete.

**5. Created supporting components and docs**

- `Toolbar.jsx` — centralized day/night toggle and settings button.
- Updated all five contract docs under `docs/contracts/` to reflect the new architecture.
- Deleted dead code: `javascript-basics.js`, `StoryNode.jsx`.

**6. Bug fixes**

- Fixed `StoryBeat` not resetting state between beats (added `key={beatIndex}` to force remount).
- Fixed completion phase not rendering (reordered render checks in `App.jsx`).
- Removed unused `isFetchingAiQuestions` state variable.
- Updated `popup.html` title from "Vite + React" to "SpellPath".

### Current State

- The full pipeline works end-to-end: intake quiz → AI scaffold generation → beat-by-beat story with checkpoints → completion recap.
- OpenAI integration is live (was hitting quota limits, resolved by adding credits).
- The scaffold generates 5 beats with concepts tailored to the user's subject and level.
- Each beat has a narrative and a multiple-choice checkpoint that feeds back into the learner profile.
- Mock fallbacks work for all three endpoints when the API is unavailable.
- Build passes cleanly (`npm run build`), no linter errors.

### Next Steps

1. **Deeper story-content weaving** — The narrative and educational content are still too separate. The story should meander more slowly, with tense emotion and organic integration of concepts into the plot rather than abrupt "here's the lesson, now here's a question" transitions.
2. **Typography and layout overhaul** — Text should feel more conversational and spacious. The current layout is too dense and blocky. Questions should not span the full horizontal width.
3. **Richer checkpoint interaction** — Add free-text reasoning fields so users can explain their thinking, enabling more nuanced adaptation (e.g., recognizing partially-correct frameworks).
4. **Adaptive scaffold modification** — The engine supports `adjustScaffold` (insert/annotate/skip), but the beat endpoint doesn't yet request or apply scaffold adjustments based on checkpoint performance.
5. **Persistent progress** — Save learner state so users can resume where they left off.
