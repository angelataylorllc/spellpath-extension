# Purpose

Continuously adjust the experience without breaking coherence.

# Responsibilities

The AI may suggest a `scaffoldAdjustment` in its beat response when the learner's performance clearly warrants a change:

- **insert** — add new beats after the current one (e.g., a remedial beat for a misconception)
- **annotate** — update the narrative hint or checkpoint focus of an upcoming beat
- **skip** — remove the next beat if it covers a concept the learner has already confirmed (only if the beat's flexibility is `skippable`)

The engine (`StoryEngine.adjustScaffold`) applies these adjustments to the scaffold in memory. The scaffold bends but does not break — the original learning goal and overall arc are preserved.

The engine may also **force** a remedial beat when the learner misses the **same concept twice** (`REMEDIAL_MISCONCEPTION_THRESHOLD = 2` in `src/stories/adaptation.js`). This does not wait on the model — it inserts a `isRemedial: true` beat at the cursor before the next beat loads.

# How Adaptation Flows

1. Learner answers a checkpoint.
2. Engine records the result in `learnerProfile`.
3. **UI** shows an adaptation notice after a wrong answer:
   - First miss on a concept: “Next beat will revisit [concept] through the story.”
   - Second miss on the same concept: “We'll take an extra beat to revisit [concept] before moving on.”
4. On **Continue**, the engine may insert a forced remedial beat, then calls `POST /api/beat` with the updated profile.
5. When a beat loads, any `scaffoldAdjustment` from that beat response is applied **before** the narrative is shown (insert/annotate/skip after the current beat index).
6. The AI sees misconceptions and confirmed understandings, and may weave corrections into the narrative.

# Constraints

- No abrupt tone shifts.
- No restarting unless user asks.
- No escalation beyond user's comfort zone without consent.
- Adjustments should feel organic — the story absorbs them seamlessly.

# Output

A smoothly evolving story-learning experience that:

- Feels responsive
- Feels intentional
- Never feels chaotic
