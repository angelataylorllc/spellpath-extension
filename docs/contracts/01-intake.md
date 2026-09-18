# Purpose

Establish the learner's starting point and constraints with minimal friction, using a two-stage quiz: universal questions first, then AI-generated subject-specific probes.

# Flow

1. **Universal questions (hardcoded, 3 total):**
   - Age range (choice: 6–10 / 11–13 / 13–17 / 18–64 / 65+) — sets story length and diction (shortest/simplest → standard adult → unhurried everyday words). Old values `under_13` / `18_24` / `25_44` / `45_64` map to `11_13` / `18_64`.
   - Experience level with the subject (choice: beginner / intermediate / advanced)
   - Motivation (choice: curious / school / building) — shapes the journey ending (tour vs unit vs make). Old values `work`/`passion` map to building/curious.

2. **AI-generated questions (2–3, from `POST /api/intake`):**
   - Generated based on `{ subject, genre, age, level, motivation }`
   - Probe actual topic knowledge at varying complexity
   - Mostly multiple choice; at most one optional textarea for goals
   - Calibrated to **both** age range and stated level

# Question Types

| Type | Rendering | Example |
|------|-----------|---------|
| `choice` | Multiple-choice buttons, auto-advances on click | "Have you heard of quantum entanglement?" |
| `textarea` | Multi-line text area + Continue/Skip buttons | "What do you want to learn or accomplish?" |

`fill_blank` and free-text age input are **not** used in the intake flow.

# AI-Generated Question Rules

The AI must:

- Generate **2–3 questions total** (never more than 3)
- Ask about the **subject only** — never about the story genre, storytelling, or fiction craft
- Mention the subject by name in every question
- Calibrate complexity to **both** age range and level
- Include at least **2 `choice`** questions probing subject-specific familiarity or understanding
- Include **at most 1 `textarea`** (optional skip) as the last question — combine learning goals into one prompt
- **Not** use `fill_blank`
- Keep questions warm, non-intimidating, and concise
- Not teach or explain — only probe
- Not repeat what the universal questions already asked
- Order from easiest/warmest to most specific

# API Schema

`POST /api/intake`

Input:

```json
{ "subject": "string", "genre": "string", "age": "string", "level": "string", "motivation": "string" }
```

Age values: `6_10`, `11_13`, `13_17`, `18_64`, `65_plus`

Output:

```json
{
  "questions": [
    {
      "id": "ai_1",
      "text": "question text",
      "type": "choice | textarea",
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
- Textarea questions allow skipping (empty answer) — the learner should never feel trapped.

# Output

All answers (universal + AI-generated) are collected into a single `answers` array:

```json
[
  { "questionId": "u_1", "answer": "18_64" },
  { "questionId": "u_2", "answer": "beginner" },
  { "questionId": "u_3", "answer": "building" },
  { "questionId": "ai_1", "answer": "recognize" },
  { "questionId": "ai_2", "answer": "practical" },
  { "questionId": "ai_3", "answer": "I want to connect Printify to Etsy..." }
]
```

This array plus structured `age`, `level`, and `motivation` are passed to the scaffold phase (`POST /api/scaffold`) where they inform the beat structure, difficulty arc, and narrative calibration.
