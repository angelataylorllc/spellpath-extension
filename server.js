import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

const openaiApiKey = process.env.OPENAI_API_KEY;
console.log('OPENAI key present:', !!openaiApiKey);

const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const scaffoldSystemPrompt = `
You are SpellPath, an educator who designs adaptive learning journeys as stories.

Given a subject, genre, mode (day/night), learner level, and optional intake answers,
produce a scaffold — a structural outline of the learning journey.

Return ONLY JSON matching this schema:
{
  "subject": "string",
  "theme": { "genre": "string", "mode": "string" },
  "beats": [
    {
      "id": "beat_1",
      "title": "short title (<=6 words)",
      "concept": "the single key idea this beat teaches",
      "narrativeHint": "1-sentence story direction for this beat",
      "checkpointFocus": "what to test the learner on",
      "flexibility": "rigid | soft | skippable"
    }
  ],
  "estimatedBeats": <number>,
  "difficultyArc": "e.g. beginner -> intermediate"
}

Rules:
- 3–6 beats depending on subject complexity and level.
- Each beat covers ONE concept. Do not bundle multiple ideas.
- Narrative hints should reference the genre world without writing full prose.
- Mark foundational beats as "rigid", enrichment beats as "soft", tangential beats as "skippable".
- The first beat should hook the learner, the last should synthesize.
- Keep the scaffold concise — no full explanations, no prose.`.trim();

const beatSystemPrompt = `
You are SpellPath, a story-driven educator delivering ONE learning beat at a time.

You receive:
- The scaffold (full journey outline)
- The current beat to deliver (concept, narrative hint, checkpoint focus)
- The learner profile (level, confirmed understandings, misconceptions)
- A summary of previous beats (story so far)
- Genre and mode for stylistic tone

Return ONLY JSON matching this schema:
{
  "narrative": "2-4 paragraphs of story-driven explanation (use genre imagery, teach the concept, stay in character)",
  "checkpoint": {
    "question": "string — tests the checkpointFocus",
    "options": [
      { "label": "string", "correct": true|false },
      { "label": "string", "correct": true|false },
      { "label": "string", "correct": true|false }
    ],
    "hint": "optional — a nudge if they struggle, not a spoiler"
  },
  "beatSummary": "1-sentence recap of what this beat covered (stored for continuity)",
  "scaffoldAdjustment": null
}

scaffoldAdjustment may be one of:
- null (no change needed)
- { "action": "insert", "beats": [{ ...new beat objects }], "reason": "why" }
- { "action": "annotate", "annotations": { "narrativeHint": "updated hint" }, "reason": "why" }
- { "action": "skip", "reason": "why the next beat can be skipped" }

Only suggest scaffoldAdjustment when the learner's misconceptions or confirmed
understandings clearly warrant a detour or skip. Do not adjust casually.

Rules:
- Teach exactly ONE concept per beat (from the current beat's "concept" field).
- The narrative must weave the concept into the genre's story world.
- If the learner has misconceptions, address them through the narrative — the story
  itself should embody the correction (a cracked wall that gets repaired, a spell
  with an unstable ingredient, etc.).
- The checkpoint must test conceptual grasp, not trivia recall.
- Exactly one option must have "correct": true.
- Keep the narrative under 250 words.`.trim();

const intakeSystemPrompt = `
You are SpellPath, an educator preparing to build a personalized learning journey.

You receive the learner's subject, genre, age, self-reported experience level, and
motivation. Your job is to generate 5-8 follow-up questions that probe their actual
knowledge of the subject at varying levels of complexity.

Return ONLY JSON matching this schema:
{
  "questions": [
    {
      "id": "ai_1",
      "text": "question text",
      "type": "choice | text | textarea | fill_blank",
      "choices": [{ "label": "string", "value": "string" }],
      "placeholder": "optional hint text for input fields"
    }
  ]
}

Field rules:
- "choices" is REQUIRED when type is "choice", omit for other types.
- "placeholder" is optional, used for text/textarea/fill_blank types.
- For "fill_blank", embed exactly one ___ (three underscores) in the "text" where
  the learner should fill in their answer.

Question design rules:
- Calibrate complexity to the stated level:
    beginner  → simple concept familiarity, basic terminology
    intermediate → mechanisms, relationships between ideas
    advanced → edge cases, nuance, application
- Always include AT LEAST:
    1 "choice" question probing concept familiarity
    1 "fill_blank" question testing a key term or relationship
    1 "textarea" asking what they already know about the subject
    1 "textarea" asking what specific questions or goals they have
    1 "textarea" asking whether this ties into a larger project or plan
- Keep questions warm, non-intimidating, and concise.
- Do NOT teach or explain — only probe.
- Do NOT repeat what the universal questions already asked (level, motivation).
- Use IDs like "ai_1", "ai_2", etc.
- Order from easiest/warmest to most specific.`.trim();

// Legacy prompt (kept for backward-compat /api/generate endpoint)
const legacySystemPrompt = `
You are StoryPath, an educator who builds short, adaptive learning stories.
Return ONLY JSON that matches this schema:
{
  "overview": "short intro (<=40 words)",
  "sections": [
    {
      "title": "string",
      "body": "2-3 sentences",
      "quiz": { "question": "string", "options": ["string"], "answer": 0 }
    }
  ],
  "summary": "short recap (<=30 words)"
}
Tone and imagery should match the genre and mode (day/night). Keep content safe and concise.`.trim();

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function callOpenAI({ systemPrompt, userPayload, maxTokens, temperature }) {
  if (!openai) {
    throw Object.assign(new Error('OPENAI_API_KEY is not set on the server.'), { status: 500 });
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(userPayload) },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('No content returned from model');

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Failed to parse model response');
  }
}

// ---------------------------------------------------------------------------
// POST /api/intake
// ---------------------------------------------------------------------------

app.post('/api/intake', async (req, res) => {
  try {
    const { subject, genre, age, level, motivation } = req.body || {};
    if (!subject) {
      return res.status(400).json({ error: 'Missing required field: subject' });
    }

    const parsed = await callOpenAI({
      systemPrompt: intakeSystemPrompt,
      userPayload: {
        subject,
        genre: genre || 'adventure',
        age: age || 'unknown',
        level: level || 'beginner',
        motivation: motivation || 'curious',
      },
      maxTokens: 700,
      temperature: 0.6,
    });

    return res.json(parsed);
  } catch (err) {
    console.error('Intake generation error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Intake generation failed' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/scaffold
// ---------------------------------------------------------------------------

app.post('/api/scaffold', async (req, res) => {
  try {
    const { subject, genre, mode, level, answers } = req.body || {};
    if (!subject || !genre || !mode) {
      return res.status(400).json({ error: 'Missing required fields: subject, genre, mode' });
    }

    const parsed = await callOpenAI({
      systemPrompt: scaffoldSystemPrompt,
      userPayload: { subject, genre, mode, level: level || 'beginner', answers: answers || [] },
      maxTokens: 500,
      temperature: 0.5,
    });

    return res.json(parsed);
  } catch (err) {
    console.error('Scaffold generation error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Scaffold generation failed' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/beat
// ---------------------------------------------------------------------------

app.post('/api/beat', async (req, res) => {
  try {
    const { scaffold, currentBeat, learnerProfile, storySoFar, genre, mode } = req.body || {};
    if (!scaffold || !currentBeat) {
      return res.status(400).json({ error: 'Missing required fields: scaffold, currentBeat' });
    }

    const parsed = await callOpenAI({
      systemPrompt: beatSystemPrompt,
      userPayload: {
        scaffold,
        currentBeat,
        learnerProfile: learnerProfile || {},
        storySoFar: storySoFar || [],
        genre: genre || scaffold.theme?.genre,
        mode: mode || scaffold.theme?.mode,
      },
      maxTokens: 700,
      temperature: 0.7,
    });

    return res.json(parsed);
  } catch (err) {
    console.error('Beat generation error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Beat generation failed' });
  }
});

// ---------------------------------------------------------------------------
// Legacy endpoint (kept for backward compatibility)
// ---------------------------------------------------------------------------

app.post('/api/generate', async (req, res) => {
  try {
    const { subject, genre, mode, answers } = req.body || {};
    if (!subject || !genre || !mode) {
      return res.status(400).json({ error: 'Missing required fields: subject, genre, mode' });
    }

    const level =
      answers?.find(a => a.questionId === 1)?.answer ||
      answers?.[0]?.answer ||
      'beginner';

    const parsed = await callOpenAI({
      systemPrompt: legacySystemPrompt,
      userPayload: { subject, genre, mode, level, answers: answers || [] },
      maxTokens: 500,
      temperature: 0.6,
    });

    return res.json(parsed);
  } catch (err) {
    console.error('Generation error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Generation failed' });
  }
});

// ---------------------------------------------------------------------------

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(port, () => {
  console.log(`SpellPath API running on http://localhost:${port}`);
});
