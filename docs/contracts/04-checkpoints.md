# Purpose

Gauge understanding and adapt the path in real time.

# Responsibilities

The AI must:

- Ask questions that test conceptual grasp, not trivia recall.
- Provide exactly three options, with exactly one correct answer.
- Include `feedbackCorrect` and `feedbackIncorrect` — one sentence each, shown after the learner locks in a choice.
- Include an optional `hint` as fallback (legacy).

The engine uses the learner's response to:

- Update `learnerProfile.confirmedUnderstandings` (correct answers)
- Update `learnerProfile.misconceptions` (incorrect answers, tagged with the beat's concept)
- Inform the next beat's narrative — misconceptions are addressed through story, not lecture.

# Current Implementation

Checkpoints are interactive multiple-choice rendered by `StoryBeat.jsx`. The learner selects an option, submits ("Lock in your choice"), and sees immediate visual feedback (correct/incorrect highlighting) plus a one-sentence explanation (`feedbackCorrect` or `feedbackIncorrect`).

Free-text reasoning input ("explain your thinking") is planned for a future iteration and will enrich the learner profile with reasoning patterns, not just right/wrong signals.

# Constraints

- No grading language.
- No "correct/incorrect" framing in the narrative — the story handles corrections.
- One checkpoint per beat.
- No punishment loops — a wrong answer shifts the scaffold, it does not trap the learner.

# Output

Updated internal state (managed by `StoryEngine`):

- `confirmedUnderstandings` — concepts the learner has demonstrated grasp of
- `misconceptions` — concepts where the learner's answer was incorrect, with beat index
- `scaffoldAdjustment` — optional adjustment suggested by the AI (insert, annotate, skip)
