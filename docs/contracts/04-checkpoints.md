# Purpose

Gauge understanding and adapt the path in real time.

# Responsibilities

The AI must:

- Ask questions that test **conceptual grasp** of `checkpointFocus`, not trivia or story recall.
- The question must be **in-world** (a dilemma in the scene), not a textbook definition ("What is the difference between X and Y?").
- Provide exactly three options; exactly one correct.
- **Wrong options** must be plausible — common misconceptions, partial truths, or tempting shortcuts — never obviously silly, and not two copies of the same wrong idea.
- If the learner just steered, test **this** path's concept, not the previous closer's leftover pitch.
- Include `feedbackCorrect` and `feedbackIncorrect` — one sentence each, shown after lock-in.
- Name the concept plainly in feedback (not "Correct!").

The engine uses the learner's response to:

- Update `learnerProfile.confirmedUnderstandings` (correct answers)
- Update `learnerProfile.misconceptions` with `{ concept, beatIndex, wrongAnswer }` (incorrect answers)
- Pass `recentCheckpoints` to the next beat so the narrative can adapt
- Show an adaptation notice after incorrect answers (revisit vs. extra practice beat)

# Current Implementation

Checkpoints are interactive multiple-choice rendered by `StoryBeat.jsx`. The learner selects an option, submits ("Lock in your choice"), and sees visual feedback plus one-sentence explanation.

# Constraints

- No grading language in the narrative.
- One checkpoint per beat.
- No punishment loops — a wrong answer informs the next beat, it does not trap the learner.

# Output

Updated internal state (managed by `StoryEngine`):

- `confirmedUnderstandings` — concepts the learner has demonstrated grasp of
- `misconceptions` — wrong answers with the selected label for adaptation
- `scaffoldAdjustment` — optional adjustment suggested by the AI (insert, annotate, skip)
