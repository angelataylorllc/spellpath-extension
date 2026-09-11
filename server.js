import express from 'express';
import dotenv from 'dotenv';
import {
  SPELLPATH_API_KEY_HEADER,
  SPELLPATH_BYOK_HEADER,
  SPELLPATH_PROVIDER_HEADER,
  getPlatformKeyStatus,
} from './server/lib/aiProvider.js';
import { callLLM } from './server/lib/llm/callLLM.js';
import { DEFAULT_MODELS } from './server/lib/llm/providers.js';
import { normalizeBeatResponse, checkpointOptionsValid } from './server/lib/normalizeBeat.js';
import { normalizeIntakeResponse } from './server/lib/normalizeIntake.js';
import { normalizeTopicValidation } from './server/lib/normalizeTopicValidation.js';
import { authorStylePromptBlock, genreVoicePromptBlock } from './lib/genreVoice.js';
import { getAuthConfig } from './server/lib/auth/config.js';
import { createRequireAuthMiddleware } from './server/lib/auth/middleware.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const authConfig = getAuthConfig();
const requireAuth = createRequireAuthMiddleware(authConfig);

const platformKeys = getPlatformKeyStatus();
console.log('Platform keys configured:', platformKeys);
console.log('BYOK allowed:', process.env.SPELLPATH_ALLOW_BYOK !== 'false');
console.log('Auth required:', authConfig.authRequired, '| Allowlist size:', authConfig.allowlist.size);

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    `Origin, X-Requested-With, Content-Type, Accept, Authorization, ${SPELLPATH_PROVIDER_HEADER}, ${SPELLPATH_API_KEY_HEADER}, ${SPELLPATH_BYOK_HEADER}`,
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

Given a subject, genre, mode (day/night), learner age range, experience level, motivation,
and intake answers, produce a scaffold — a structural outline of the learning journey.

Return ONLY JSON matching this schema:
{
  "subject": "string",
  "theme": { "genre": "string", "mode": "string" },
  "topicType": "concept | tool_workflow | skill",
  "learningFocus": "string — echo from intake, e.g. practical, concepts",
  "learningGoalsSummary": "string — one sentence distillation of learner goals, or empty",
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
- checkpointFocus is for planning only — it should name the idea to test and a common misconception to avoid,
  e.g. "Learner distinguishes X from Y; common mistake: thinking Z is enough."
- Mark foundational beats as "rigid", enrichment beats as "soft", tangential beats as "skippable".
- The first beat should hook the learner, the last should synthesize.
- Keep the scaffold concise — no full explanations, no prose.

Calibration (use age range AND level together):
- age under_13 or 13_17 → simpler vocabulary, concrete examples, fewer abstract leaps
- age 65_plus → clear pacing, respectful tone; avoid jargon without context
- beginner → foundational concepts first; difficultyArc should stay mostly beginner
- intermediate → connect ideas; include at least one mechanism/relationship beat
- advanced → nuance, edge cases, or application under constraints
- motivation "work" or "building" → when intake answers suggest it, favor practical beats over pure metaphor
- Read intake answers carefully — tailor beat concepts to what the learner said they know and want to learn.

Topic type (infer from subject + learningGoals + learningFocus):
- "concept" — abstract ideas (cloud computing, photosynthesis, supply and demand)
- "tool_workflow" — software, platforms, procedures (Printify, Photoshop, filing taxes)
- "skill" — learnable practice (public speaking, watercolor, chess strategy)

Beat arc by topicType:
- concept → wonder → mental model → mechanism → implication → synthesis (metaphor-friendly OK)
- tool_workflow → orient → setup → connect/integrate → apply in scenario → troubleshoot or optimize
- skill → foundation → core technique → guided practice → refinement → real-world application

learningGoals and learningFocus are PRIMARY constraints:
- If learningGoals names specific tasks (e.g. "connect Printify to Etsy"), dedicate beats to those — not generic overview.
- Match learningFocus: "practical" → hands-on scenario beats; "concepts" → how-it-works beats; etc.
- learningGoalsSummary: distill learningGoals into one plain sentence for beat writers; empty string if none given.

Topic category (when provided in user payload as topicCategory):
- "standard" — default teaching rules
- "heritage" — clan, family, ancestry, genealogy: teach documented history and research methods; NEVER invent
  specific personal lineage, ancestors, or family facts; hedge claims ("historians believe", "many families");
  include how to verify with archives and primary sources; do not present AI guesses as the learner's family truth
- "niche" — obscure or hard-to-verify topics: hedge factual claims; prefer teaching frameworks and verification
  over invented specifics

GENRE VOICE (see genreVoice in user payload — CRITICAL):
- Every narrativeHint MUST match the selected genre. Never plan plain documentary or textbook beats when a genre is set.
- If authorStyle is in the payload, plan hints that fit that prose voice within genre rules.`.trim();

const heritageBeatRules = `
HERITAGE / GENEALOGY (when scaffold.topicCategory is "heritage"):
- Teach documented history and how to research — not fabricated personal lineage.
- NEVER state as fact that the learner's specific ancestors did X unless framed as illustrative fiction.
- Hedge historical claims; name concepts plainly in dialogue.
- Checkpoints test understanding of history/research concepts, not made-up family trivia.`.trim();

const beatSystemPrompt = `
You are SpellPath, writing ONE beat of an interactive story that secretly teaches one concept.

You receive (JSON user payload):
- scaffold (includes topicType, learningGoalsSummary, learningFocus), currentBeat (concept, narrativeHint, checkpointFocus), learnerProfile (level, age, motivation, learningGoals, learningFocus, confirmedUnderstandings, misconceptions), storySoFar, recentCheckpoints
- genre, mode
- beatIndex (0-based index of this beat in the journey) and totalBeats
- previousNarrativeOpening (optional): first paragraph of the LAST beat’s narrative — used only to avoid repetition

Tone: choose-your-own-adventure / fiction-first. Build a scene with dialogue and momentum — but the learner must leave this beat understanding currentBeat.concept.
Calibrate vocabulary and complexity to learnerProfile.age and learnerProfile.level (see scaffold calibration rules).
Respect scaffold.topicType: tool_workflow beats teach actionable steps through scenario; concept beats may use metaphor
but must land the idea; skill beats show technique through practice in scene.
If scaffold.learningGoalsSummary is non-empty, tie this beat's concept directly to those goals — do not drift generic.

GENRE + AUTHOR (see genreVoice and authorStyleGuide in user payload — CRITICAL):
- Every beat MUST feel like the selected genre — not plain history or documentary tone.
- If authorStyleGuide is non-empty, evoke that prose mood and rhythm; never name the author or their books in text.

ADAPTATION (when learnerProfile or recentCheckpoints show prior results):
- If misconceptions is non-empty: the narrative MUST address the most recent misconception through story events
  (not a lecture). Weave the correction into dialogue or a failed attempt that gets redirected.
- If the learner got the last checkpoint wrong (see recentCheckpoints): open by contrasting their wrong intuition
  with what actually works — still in scene, not "you were wrong."
- If currentBeat.isRemedial is true: this is a forced practice beat — simplify the example, name the concept
  clearly in dialogue, and test the exact idea the learner missed twice.
- If confirmedUnderstandings is non-empty: do not re-teach those concepts from scratch; build on them.
- Suggest scaffoldAdjustment (insert/annotate) only when a misconception clearly needs an extra remedial beat.
${heritageBeatRules}

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
    "feedbackCorrect": "string — one sentence explaining why the correct choice is right",
    "feedbackIncorrect": "string — one sentence explaining why a wrong choice misses and what the right idea is",
    "hint": "optional — legacy nudge; prefer feedback fields"
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
- TEACHING (required): By paragraph 4 at latest, the narrative must make currentBeat.concept concrete —
  the learner should be able to state the idea in plain language after reading. For tool_workflow topics,
  show a specific step, decision, or connection (e.g. linking Printify to TikTok Shop), not vague metaphor alone.
  Use at least ONE explicit story moment where a character names or demonstrates the concept (still in voice).
- Paragraph 5 (or end of 4 if tight): Land the moment that makes the checkpoint inevitable — still in scene.
- If beatIndex is 0: you may establish setting. If beatIndex > 0: treat storySoFar as continuity — advance time or
  situation; do not restart with a fresh generic establishing shot that ignores what already happened.
- Do not put the checkpoint question text inside the narrative.
- NEVER break the fourth wall: do not mention "checkpoint", "quiz", "the question forming in your mind", or that the learner is being tested.

CHECKPOINT (after the story is built):
- "question": ONE short sentence (18 words max), in-world, sounding like a dilemma or choice — not a textbook.
- Options: three short labels (each ≤ 12 words). Exactly one correct. Return as { "label", "correct" } objects.
  Order does not matter — options are shuffled before display.
- The checkpoint tests currentBeat.checkpointFocus — conceptual grasp, not trivia or story recall.
- WRONG options must be plausible: each should reflect a common misconception, partial truth, or tempting
  shortcut someone might infer from the story. None should be obviously absurd or unrelated.
- If learnerProfile.misconceptions includes wrongAnswer text from a prior beat, do NOT repeat that exact
  wrong option — but DO craft distractors that resemble real mistakes for THIS concept.
- Avoid: joke options, "none of the above," options that are clearly silly, or options that repeat the
  question wording verbatim.
- The correct option should require understanding the concept, not just remembering a character name.
- Return options as objects: { "label": "visible text", "correct": true|false } — never bare strings.
- "feedbackCorrect": ONE sentence (max 25 words) — names the concept from checkpointFocus in plain language.
- "feedbackIncorrect": ONE sentence (max 25 words) — explains why the tempting wrong choice fails and states the right idea.

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

You receive the learner's subject, genre, age range, self-reported experience level, motivation,
learningFocus, and optional learningGoals (free text from the home screen). Generate exactly 2–3
follow-up questions (never more than 3) that probe their knowledge of THE SUBJECT ONLY.

CRITICAL — subject vs genre:
- "subject" is what the learner wants to LEARN (e.g. "printify", "cloud computing", "photosynthesis").
- "genre" (fantasy, sci-fi, mystery, etc.) is ONLY the story wrapper used later — it is NOT the topic.
- Every question MUST be about the subject. NEVER ask about storytelling, fiction, the genre,
  narrative structure, world-building, plot, characters as literary elements, or "fantasy worlds".
- Mention the subject by name in every question text (e.g. "With Printify, …" not "In a fantasy world, …").

Return ONLY JSON matching this schema:
{
  "questions": [
    {
      "id": "ai_1",
      "text": "question text",
      "type": "choice | textarea",
      "choices": [{ "label": "string", "value": "string" }],
      "placeholder": "optional hint text for textarea"
    }
  ]
}

Field rules:
- "choices" is REQUIRED when type is "choice", omit for textarea.
- "placeholder" is optional, used only for textarea.
- Do NOT use "fill_blank" or "text" types.

Question design rules:
- Calibrate complexity to BOTH age range AND stated level:
    age under_13 or 13_17 → very simple language, concrete familiar examples
    age 18_24 through 45_64 → standard complexity for the stated level
    age 65_plus → clear, respectful; slightly more context when needed
    beginner → concept familiarity, basic terminology
    intermediate → mechanisms, relationships between ideas
    advanced → edge cases, nuance, application
- Prefer "choice" for every question when possible.
- Include at least 2 "choice" questions about the SUBJECT — familiarity, use cases, or understanding.
- Tailor choice questions to learningFocus when provided (e.g. focus "practical" → integration/setup questions).
- If learningGoals is non-empty: generate ONLY 2 "choice" questions — do NOT include a textarea
  (goals are already captured; do not ask again).
- If learningGoals is empty: include at most ONE "textarea" (skippable) as the last question — what they
  want to learn or accomplish with THIS SUBJECT.
- Do NOT use fill-in-the-blank questions.
- Do NOT repeat what the universal questions already asked (age range, level, motivation).
- Do NOT ask about the genre or story style under any circumstances.
- Keep questions warm, non-intimidating, and concise.
- Do NOT teach or explain — only probe.
- Use IDs "ai_1", "ai_2", "ai_3".
- Order from easiest/warmest to most specific.

Good example (subject=printify, genre=fantasy):
  "Have you used Printify before, or is this your first time hearing about it?"
Bad example (NEVER generate this):
  "Which element is most important in a fantasy world?"`.trim();

const validateTopicSystemPrompt = `
You are SpellPath's topic gate. Decide whether a learner's topic is suitable for an AI-generated educational story.

You receive: subject (required), genre, optional learningGoals, optional learningFocus, optional authorStyle.

Return ONLY JSON:
{
  "status": "accept" | "clarify" | "reject",
  "category": "standard" | "heritage" | "niche" | "unknown",
  "normalizedSubject": "cleaned topic label for display, or empty to keep original",
  "reason": "one friendly sentence for the learner",
  "suggestions": ["optional rewrite examples", "..."],
  "authorStyleCheck": {
    "status": "accept" | "warn" | "skip",
    "reason": "one sentence if warn — empty if accept",
    "suggestedGenre": "fantasy | scifi | mystery | horror | adventure | null"
  }
}

If authorStyle is empty, set authorStyleCheck.status to "skip" and omit reason.

If authorStyle is provided, assess whether that author's prose style plausibly fits the selected genre:
- accept: good fit (e.g. Marion Zimmer Bradley + fantasy, Agatha Christie + mystery)
- warn: weak fit (e.g. hard sci-fi author + fantasy, horror author + adventure) — explain gently and suggest a better genre or similar author
- Do NOT reject the whole topic because of author mismatch — only warn in authorStyleCheck

Decision rules (bias toward clarify over reject when uncertain):

REJECT only when:
- Unreadable garbage, keyboard mash, empty meaning, obvious joke nonsense with no learnable anchor
- Hateful, violent, racist, sexist, harassing, or sexual content — or content whose purpose is harm, not learning
- Clearly not an educational topic (e.g. slurs, "how to hurt someone")

CLARIFY when:
- Real but too vague: "history", "science", "business", "my family" without specifics
- Heritage/genealogy/clan/family name topics WITHOUT specific learningGoals (category should be "heritage")
- Obscure topic where intent is unclear
- Provide 2–3 helpful suggestions in suggestions[]

ACCEPT when:
- Clear skill, tool, school subject, or well-scoped topic
- learningGoals (≥12 chars) makes a vague topic specific enough
- Heritage topics WITH specific learningGoals (e.g. "Clan Munro documented history", "how to research our surname")

Categories:
- "heritage" — family, clan, ancestry, genealogy, surname origins, "my roots"
- "niche" — obscure tools, very specific subtopics with limited public documentation
- "standard" — most topics
- "unknown" — unclear

Keep reason warm and concise. Never preachy.`.trim();

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
// Routes
// ---------------------------------------------------------------------------

app.get('/api/auth/me', requireAuth, (req, res) => {
  if (!authConfig.authRequired) {
    return res.json({ authRequired: false });
  }
  return res.json({
    authRequired: true,
    user: {
      email: req.spellpathUser.email,
      name: req.spellpathUser.name,
      picture: req.spellpathUser.picture,
    },
  });
});

app.post('/api/validate-topic', requireAuth, async (req, res) => {
  try {
    const { subject, learningGoals, learningFocus, genre, authorStyle } = req.body || {};
    if (!subject || !String(subject).trim()) {
      return res.status(400).json({ error: 'Missing required field: subject' });
    }

    const parsed = await callLLM(req, 'validate-topic', {
      systemPrompt: validateTopicSystemPrompt,
      userPayload: {
        subject: String(subject).trim(),
        genre: genre || 'adventure',
        learningGoals: learningGoals || '',
        learningFocus: learningFocus || '',
        authorStyle: authorStyle || '',
      },
      maxTokens: 400,
      temperature: 0.2,
    });

    return res.json(
      normalizeTopicValidation(parsed, {
        subject: String(subject).trim(),
        learningGoals: learningGoals || '',
        authorStyle: authorStyle || '',
        genre: genre || 'adventure',
      }),
    );
  } catch (err) {
    console.error('Topic validation error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Topic validation failed' });
  }
});

app.post('/api/intake', requireAuth, async (req, res) => {
  try {
    const { subject, genre, age, level, motivation, learningGoals, learningFocus } = req.body || {};
    if (!subject) {
      return res.status(400).json({ error: 'Missing required field: subject' });
    }

    const parsed = await callLLM(req, 'intake', {
      systemPrompt: intakeSystemPrompt,
      userPayload: {
        subject,
        genre: genre || 'adventure',
        genreNote: 'Story genre only — do NOT ask quiz questions about genre or storytelling.',
        age: age || 'unknown',
        level: level || 'beginner',
        motivation: motivation || 'curious',
        learningFocus: learningFocus || 'general',
        learningGoals: learningGoals || '',
      },
      maxTokens: 500,
      temperature: 0.6,
    });

    return res.json(normalizeIntakeResponse(parsed, { subject, learningGoals }));
  } catch (err) {
    console.error('Intake generation error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Intake generation failed' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/scaffold
// ---------------------------------------------------------------------------

app.post('/api/scaffold', requireAuth, async (req, res) => {
  try {
    const { subject, genre, mode, level, age, motivation, learningGoals, learningFocus, answers, topicCategory, authorStyle } =
      req.body || {};
    if (!subject || !genre || !mode) {
      return res.status(400).json({ error: 'Missing required fields: subject, genre, mode' });
    }

    const parsed = await callLLM(req, 'scaffold', {
      systemPrompt: scaffoldSystemPrompt,
      userPayload: {
        subject,
        genre,
        mode,
        level: level || 'beginner',
        age: age || 'unknown',
        motivation: motivation || 'curious',
        learningFocus: learningFocus || 'general',
        learningGoals: learningGoals || '',
        topicCategory: topicCategory || 'standard',
        authorStyle: authorStyle || '',
        genreVoice: genreVoicePromptBlock(genre),
        authorStyleGuide: authorStylePromptBlock(authorStyle),
        answers: answers || [],
      },
      maxTokens: 1500,
      temperature: 0.5,
    });

    return res.json({
      ...parsed,
      topicCategory: topicCategory || parsed?.topicCategory || 'standard',
      authorStyle: authorStyle || '',
    });
  } catch (err) {
    console.error('Scaffold generation error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Scaffold generation failed' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/beat
// ---------------------------------------------------------------------------

app.post('/api/beat', requireAuth, async (req, res) => {
  try {
    const {
      scaffold,
      currentBeat,
      learnerProfile,
      storySoFar,
      recentCheckpoints,
      genre,
      mode,
      beatIndex,
      totalBeats,
      previousNarrativeOpening,
    } = req.body || {};
    if (!scaffold || !currentBeat) {
      return res.status(400).json({ error: 'Missing required fields: scaffold, currentBeat' });
    }

    const beatPayload = {
      scaffold,
      currentBeat,
      learnerProfile: learnerProfile || {},
      storySoFar: storySoFar || [],
      recentCheckpoints: recentCheckpoints || [],
      genre: genre || scaffold.theme?.genre,
      mode: mode || scaffold.theme?.mode,
      authorStyle: scaffold?.authorStyle || '',
      genreVoice: genreVoicePromptBlock(genre || scaffold.theme?.genre || 'adventure'),
      authorStyleGuide: authorStylePromptBlock(scaffold?.authorStyle),
      beatIndex: Number.isFinite(beatIndex) ? beatIndex : 0,
      totalBeats: Number.isFinite(totalBeats) ? totalBeats : scaffold?.beats?.length ?? 0,
      previousNarrativeOpening:
        typeof previousNarrativeOpening === 'string' && previousNarrativeOpening.trim()
          ? previousNarrativeOpening.trim().slice(0, 600)
          : null,
    };

    let parsed = normalizeBeatResponse(await callLLM(req, 'beat', {
      systemPrompt: beatSystemPrompt,
      userPayload: beatPayload,
      maxTokens: 1200,
      temperature: 0.78,
    }));

    if (!checkpointOptionsValid(parsed?.checkpoint)) {
      console.warn('[spellpath] beat checkpoint options invalid; retrying once…');
      parsed = normalizeBeatResponse(await callLLM(req, 'beat', {
        systemPrompt: beatSystemPrompt,
        userPayload: beatPayload,
        maxTokens: 1200,
        temperature: 0.65,
      }));
    }

    return res.json(parsed);
  } catch (err) {
    console.error('Beat generation error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Beat generation failed' });
  }
});

// ---------------------------------------------------------------------------
// Legacy endpoint (kept for backward compatibility)
// ---------------------------------------------------------------------------

app.post('/api/generate', requireAuth, async (req, res) => {
  try {
    const { subject, genre, mode, answers } = req.body || {};
    if (!subject || !genre || !mode) {
      return res.status(400).json({ error: 'Missing required fields: subject, genre, mode' });
    }

    const level =
      answers?.find(a => a.questionId === 1)?.answer ||
      answers?.[0]?.answer ||
      'beginner';

    const parsed = await callLLM(req, 'generate', {
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

app.get('/api/health', (_req, res) => {
  const keys = getPlatformKeyStatus();
  return res.json({
    ok: true,
    authRequired: authConfig.authRequired,
    allowlistConfigured: authConfig.allowlist.size > 0,
    byokAllowed: process.env.SPELLPATH_ALLOW_BYOK !== 'false',
    platformKeyConfigured: keys.openai,
    providers: {
      openai: { platformKeyConfigured: keys.openai, defaultModel: DEFAULT_MODELS.openai },
      anthropic: { platformKeyConfigured: keys.anthropic, defaultModel: DEFAULT_MODELS.anthropic },
      gemini: { platformKeyConfigured: keys.gemini, defaultModel: DEFAULT_MODELS.gemini },
    },
  });
});

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
