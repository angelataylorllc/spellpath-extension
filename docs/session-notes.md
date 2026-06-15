# SpellPath — Session Notes

Living doc for project status across sessions. Read this at the start of a new session before diving in.

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
