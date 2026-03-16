# Purpose

Continuously adjust the experience without breaking coherence.

# Responsibilities

The AI may suggest a `scaffoldAdjustment` in its beat response when the learner's performance clearly warrants a change:

- **insert** — add new beats after the current one (e.g., a remedial beat for a misconception)
- **annotate** — update the narrative hint or checkpoint focus of an upcoming beat
- **skip** — remove the next beat if it covers a concept the learner has already confirmed (only if the beat's flexibility is `skippable`)

The engine (`StoryEngine.adjustScaffold`) applies these adjustments to the scaffold in memory. The scaffold bends but does not break — the original learning goal and overall arc are preserved.

# How Adaptation Flows

1. Learner answers a checkpoint.
2. Engine records the result in `learnerProfile`.
3. The next `POST /api/beat` call includes the updated profile.
4. The AI sees misconceptions and confirmed understandings, and may:
   - Weave corrections into the narrative (always)
   - Suggest a `scaffoldAdjustment` (occasionally, when warranted)
5. Engine applies any adjustment before advancing.

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
