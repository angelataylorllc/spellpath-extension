import express from 'express';
import dotenv from 'dotenv';
import { resolveOpenAIForRequest, SPELLPATH_BYOK_HEADER } from './server/lib/aiProvider.js';
import { normalizeBeatResponse } from './server/lib/normalizeBeat.js';
import { parseModelJson } from './server/lib/parseModelJson.js';
import { recordOpenAIUsage } from './server/lib/usageMeter.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

const platformKeyPresent = !!String(process.env.OPENAI_API_KEY || '').trim();
console.log('Platform OPENAI_API_KEY present:', platformKeyPresent);
console.log('BYOK header allowed:', process.env.SPELLPATH_ALLOW_BYOK !== 'false');

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    `Origin, X-Requested-With, Content-Type, Accept, ${SPELLPATH_BYOK_HEADER}`
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
      "narrativeHint": "1-sentence scene direction (place, mood, what the learner sees — not a lesson summary)",
      "checkpointFocus": "what the learner must infer (conceptual), in plain language for you only",
      "flexibility": "rigid | soft | skippable"
    }
  ],
  "estimatedBeats": <number>,
  "difficultyArc": "e.g. beginner -> intermediate"
}

Rules:
- 3–6 beats depending on subject complexity and level.
- Each beat covers ONE concept. Do not bundle multiple ideas.
- narrativeHint must read like a choose-your-own-adventure beat setup (where we are, what’s at stake),
  using genre imagery. Do not write teaching prose or define terms here.
- checkpointFocus is for planning only — it should name the idea to test, not the story wording.
- Mark foundational beats as "rigid", enrichment beats as "soft", tangential beats as "skippable".
- The first beat should hook the learner, the last should synthesize.
- Keep the scaffold concise — no full explanations, no prose.`.trim();

const beatSystemPrompt = `
You are SpellPath, writing ONE beat of an interactive story that secretly teaches one concept.

You receive (JSON user payload):
- scaffold, currentBeat (concept, narrativeHint, checkpointFocus), learnerProfile, storySoFar
- genre, mode
- beatIndex (0-based index of this beat in the journey) and totalBeats
- previousNarrativeOpening (optional): first paragraph of the LAST beat’s narrative — used only to avoid repetition

Tone: choose-your-own-adventure / fiction-first. Build a scene with dialogue and momentum before any “lesson” feeling.

Return ONLY JSON matching this schema:
{
  "narrative": "string — see FORMAT below",
  "checkpoint": {
    "question": "string — short, in-world; see CHECKPOINT below",
    "options": [
      { "label": "string", "correct": true|false },
      { "label": "string", "correct": true|false },
      { "label": "string", "correct": true|false }
    ],
    "hint": "optional — a nudge if they struggle, not a spoiler"
  },
  "beatSummary": "1 plain sentence for continuity (may name the concept — not shown as story text)",
  "scaffoldAdjustment": null
}

FORMAT for "narrative" (critical):
- Use EXACTLY four or five paragraphs, separated only by \\n\\n (double newline) between paragraphs.
- Target length: 250–400 words total. No bullet lists. No “In this section we will…”
- Dialogue (required): include at least FIVE short spoken lines in straight ASCII double quotes only
  (e.g. "Like this." — never curly/smart quotes like “ or ”). Lines can be one sentence or a clause; avoid long speeches.
- Paragraph 1: Open with a NEW concrete hook — vary the sensory channel (sound, smell, touch, motion, temperature).
  Do NOT reuse the same opening image or sentence pattern as previousNarrativeOpening when it is provided
  (e.g. do not repeat “moon + market + silence + stalls” if that text appeared before).
- Paragraphs 2–4: Escalate the scene — character interaction, conflict, stakes, world detail. Let the concept
  surface through events, trade-offs, and dialogue subtext — not a lecture.
- Paragraph 5 (or end of 4 if tight): Land the moment that makes the checkpoint inevitable — still in scene.
- If beatIndex is 0: you may establish setting. If beatIndex > 0: treat storySoFar as continuity — advance time or
  situation; do not restart with a fresh generic establishing shot that ignores what already happened.
- Do not put the checkpoint question text inside the narrative.

CHECKPOINT (after the story is built):
- "question": ONE short sentence (18 words max), in-world, sounding like a dilemma or choice — not a textbook.
- Options: three short labels (each ≤ 10 words). Exactly one correct. Plausible wrong answers in-story.
- The checkpoint still tests checkpointFocus, but only through story language.

scaffoldAdjustment may be one of:
- null (no change needed)
- { "action": "insert", "beats": [{ ...new beat objects }], "reason": "why" }
- { "action": "annotate", "annotations": { "narrativeHint": "updated hint" }, "reason": "why" }
- { "action": "skip", "reason": "why the next beat can be skipped" }

Only suggest scaffoldAdjustment when the learner's misconceptions or confirmed
understandings clearly warrant a detour or skip. Do not adjust casually.

Rules:
- Teach exactly ONE concept per beat (from currentBeat.concept), through story, not outline.
- If the learner has misconceptions, show the correction as a story event or image — not a correction paragraph.
- Exactly one option must have "correct": true.
- beatSummary is internal metadata: clear and factual (may use the subject name).`.trim();

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

async function callOpenAI(req, route, { systemPrompt, userPayload, maxTokens, temperature }) {
  const { client, billingSource, error } = resolveOpenAIForRequest(req);
  if (!client || !billingSource) {
    throw Object.assign(new Error(error || 'OpenAI is not configured.'), { status: 500 });
  }

  const userJson = JSON.stringify(userPayload);
  const request = {
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userJson },
    ],
  };

  let lastParseError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const completion = await client.chat.completions.create(request);
    const choice = completion.choices[0] || {};
    const finishReason = choice.finish_reason || null;

    const usage = completion.usage || {};
    recordOpenAIUsage({
      route,
      billingSource,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    });

    try {
      return parseModelJson(choice.message?.content, { route, finishReason });
    } catch (err) {
      lastParseError = err;
      if (finishReason === 'length') {
        console.warn(`[spellpath] ${route} response truncated (attempt ${attempt + 1}); retrying…`);
      } else if (attempt === 0) {
        console.warn(`[spellpath] ${route} JSON parse failed (attempt 1); retrying…`);
      }
    }
  }

  throw lastParseError || new Error('Failed to parse model response');
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

    const parsed = await callOpenAI(req, 'intake', {
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

    const parsed = await callOpenAI(req, 'scaffold', {
      systemPrompt: scaffoldSystemPrompt,
      userPayload: { subject, genre, mode, level: level || 'beginner', answers: answers || [] },
      maxTokens: 1500,
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
    const {
      scaffold,
      currentBeat,
      learnerProfile,
      storySoFar,
      genre,
      mode,
      beatIndex,
      totalBeats,
      previousNarrativeOpening,
    } = req.body || {};
    if (!scaffold || !currentBeat) {
      return res.status(400).json({ error: 'Missing required fields: scaffold, currentBeat' });
    }

    const parsed = normalizeBeatResponse(await callOpenAI(req, 'beat', {
      systemPrompt: beatSystemPrompt,
      userPayload: {
        scaffold,
        currentBeat,
        learnerProfile: learnerProfile || {},
        storySoFar: storySoFar || [],
        genre: genre || scaffold.theme?.genre,
        mode: mode || scaffold.theme?.mode,
        beatIndex: Number.isFinite(beatIndex) ? beatIndex : 0,
        totalBeats: Number.isFinite(totalBeats) ? totalBeats : scaffold?.beats?.length ?? 0,
        previousNarrativeOpening:
          typeof previousNarrativeOpening === 'string' && previousNarrativeOpening.trim()
            ? previousNarrativeOpening.trim().slice(0, 600)
            : null,
      },
      maxTokens: 1200,
      temperature: 0.78,
    }));

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

    const parsed = await callOpenAI(req, 'generate', {
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

app.get('/api/health', (_req, res) =>
  res.json({
    ok: true,
    platformKeyConfigured: platformKeyPresent,
    byokAllowed: process.env.SPELLPATH_ALLOW_BYOK !== 'false',
  })
);

app.listen(port, () => {
  console.log(`SpellPath API running on http://localhost:${port}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use — another SpellPath API is still running.`);
    console.error(`Stop it first, then restart:  fuser -k ${port}/tcp`);
    process.exit(1);
  }
  throw err;
});
