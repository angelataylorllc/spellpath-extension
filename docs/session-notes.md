# SpellPath — Session Notes

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
