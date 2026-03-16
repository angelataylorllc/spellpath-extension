# Purpose

Establish the learner's starting point and constraints with minimal friction, using a two-stage quiz: universal questions first, then AI-generated subject-specific probes.

# Flow

1. **Universal questions (hardcoded, 3 total):**
   - Age (text input) -- for tone calibration
   - Experience level with the subject (choice: beginner / intermediate / advanced)
   - Motivation (choice: curious, school, work, building, passion)

2. **AI-generated questions (5-8, from `POST /api/intake`):**
   - Generated based on `{ subject, genre, age, level, motivation }`
   - Probe actual topic knowledge at varying complexity
   - Mix of question types (see below)
   - Calibrated to the stated level

# Question Types

| Type | Rendering | Example |
|------|-----------|---------|
| `choice` | Multiple-choice buttons, auto-advances on click | "Have you heard of quantum entanglement?" |
| `text` | Single-line text input + Continue button | "How old are you?" |
| `textarea` | Multi-line text area + Continue/Skip buttons | "What do you already know about JavaScript?" |
| `fill_blank` | Sentence with inline text input replacing `___` | "A function that calls itself is called ___" |

# AI-Generated Question Rules

The AI must:

- Calibrate complexity to the stated level
- Always include at least:
  - 1 `choice` probing concept familiarity
  - 1 `fill_blank` testing a key term or relationship
  - 1 `textarea` asking what they already know
  - 1 `textarea` asking what questions or goals they have
  - 1 `textarea` asking whether this ties into a larger project or plan
- Keep questions warm, non-intimidating, and concise
- Not teach or explain -- only probe
- Not repeat what the universal questions already asked
- Order from easiest/warmest to most specific

# API Schema

`POST /api/intake`

Input:

```json
{ "subject": "string", "genre": "string", "age": "string", "level": "string", "motivation": "string" }
```

Output:

```json
{
  "questions": [
    {
      "id": "ai_1",
      "text": "question text",
      "type": "choice | text | textarea | fill_blank",
      "choices": [{ "label": "string", "value": "string" }],
      "placeholder": "optional hint text"
    }
  ]
}
```

# Constraints

- Questions must be short, concrete, and non-intimidating.
- No jargon unless the user introduces it first.
- No assumptions about intelligence or background.
- No story exposition yet.
- Textarea questions allow skipping (empty answer) -- the learner should never feel trapped.

# Output

All answers (universal + AI-generated) are collected into a single `answers` array:

```json
[
  { "questionId": "u_1", "answer": "28" },
  { "questionId": "u_2", "answer": "beginner" },
  { "questionId": "u_3", "answer": "work" },
  { "questionId": "ai_1", "answer": "heard" },
  { "questionId": "ai_2", "answer": "recursion" },
  ...
]
```

This array is passed directly to the scaffold phase (`POST /api/scaffold`) where it informs the beat structure, difficulty arc, and narrative calibration.
