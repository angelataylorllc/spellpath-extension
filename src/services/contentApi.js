import { getOptionalUserOpenAIKey } from './apiCredentials';
import { normalizeQuotes } from '../../lib/normalizeQuotes.js';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

/** Must match server `SPELLPATH_BYOK_HEADER` (case-insensitive over HTTP). */
const SPELLPATH_BYOK_HEADER = 'X-SpellPath-OpenAI-Key';

/**
 * POST to SpellPath API; attaches optional BYOK key from chrome.storage.local.
 */
async function spellpathPost(path, body) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const userKey = await getOptionalUserOpenAIKey().catch(() => undefined);
  if (userKey) {
    headers.set(SPELLPATH_BYOK_HEADER, userKey);
  }

  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Mock fallbacks (used when the backend is unreachable)
// ---------------------------------------------------------------------------

function mockScaffold({ subject, genre, mode, level }) {
  return {
    subject,
    theme: { genre, mode },
    beats: [
      {
        id: 'beat_1',
        title: 'The Hook',
        concept: `Core idea behind ${subject}`,
        narrativeHint: `Open on a vivid ${genre} location; something small feels wrong or promising — no lecture.`,
        checkpointFocus: `Learner recognizes the main idea behind ${subject}`,
        flexibility: 'rigid',
      },
      {
        id: 'beat_2',
        title: 'Deeper Look',
        concept: `Key mechanism of ${subject}`,
        narrativeHint: `Raise the stakes with an obstacle that only makes sense through the mechanism.`,
        checkpointFocus: `Learner explains how the mechanism fits together`,
        flexibility: 'rigid',
      },
      {
        id: 'beat_3',
        title: 'Apply It',
        concept: `Practical application of ${subject}`,
        narrativeHint: `Force a choice in-scene that demands using the idea under pressure.`,
        checkpointFocus: `Learner applies ${subject} in a concrete scenario`,
        flexibility: 'soft',
      },
    ],
    estimatedBeats: 3,
    difficultyArc: `${level} -> ${level === 'advanced' ? 'advanced' : 'intermediate'}`,
  };
}

function mockBeat({ currentBeat, learnerProfile }) {
  const concept = currentBeat?.concept || 'this idea';
  const level = learnerProfile?.level || 'beginner';

  return {
    narrative:
      `Metal rungs bite your palms; the climb smells of rust and river silt. Somewhere below, a ferry horn ` +
      `answers a question nobody asked.\n\n` +
      `"You're counting wrong," a voice says from the dark. A match flares — a kid with ink on their ` +
      `cheeks, too calm. "Three beats, not two." You don't know what they mean yet, but your chest ` +
      `tightens anyway.\n\n` +
      `"Show me the pattern," you say. They laugh. "Pattern's not in the numbers. It's in what you ` +
      `ignore when you're afraid." The match dies; ember-trails drift like lazy punctuation.\n\n` +
      `"Listen," they whisper. "The water doesn't repeat. It rhymes." Footsteps echo on the span above — ` +
      `someone else hunting the same edge you are.\n\n` +
      `The kid taps the rail twice. "So — what are you actually trading? The stone, or the story you` +
      ` tell about the stone?" Wind pulls at your sleeves; the question lands like a weight on a scale.`,
    checkpoint: {
      question: `What are you really weighing in this moment?`,
      options: [
        { label: `The object in the open`, correct: false },
        { label: `The rule beneath what you see`, correct: true },
        { label: `Whatever lets you leave fastest`, correct: false },
      ],
      feedbackCorrect: `The scene keeps pointing at the underlying rule, not the surface detail.`,
      feedbackIncorrect: `The visible object is a distraction — the beat is testing the deeper pattern behind it.`,
      hint: `What would change if the root cause were different?`,
    },
    beatSummary: `Scene beat on ${concept} (${level}); checkpoint tests grasp of core idea.`,
    scaffoldAdjustment: null,
  };
}

function mockIntakeQuestions({ subject, learningGoals }) {
  const skipGoalsTextarea = Boolean(String(learningGoals || '').trim());
  const questions = [
    {
      id: 'ai_1',
      text: `Which best describes your familiarity with ${subject}?`,
      type: 'choice',
      choices: [
        { label: 'Never heard of it', value: 'none' },
        { label: 'Heard of it but can\'t explain it', value: 'recognize' },
        { label: 'Could explain the basics', value: 'explain' },
      ],
    },
    {
      id: 'ai_2',
      text: `Which aspect of ${subject} interests you most right now?`,
      type: 'choice',
      choices: [
        { label: 'Core concepts / how it works', value: 'concepts' },
        { label: 'Practical steps / how to use it', value: 'practical' },
        { label: 'Connecting it to other things I know', value: 'connections' },
      ],
    },
  ];

  if (!skipGoalsTextarea) {
    questions.push({
      id: 'ai_3',
      text: `What do you want to learn or accomplish with ${subject}? (optional)`,
      type: 'textarea',
      placeholder: 'e.g., pass a test, build something, understand a specific feature...',
    });
  }

  return { questions };
}

function normalizeBeatClient(beat) {
  if (!beat || typeof beat !== 'object') return beat;
  if (typeof beat.narrative === 'string') {
    return { ...beat, narrative: normalizeQuotes(beat.narrative) };
  }
  return beat;
}

export async function generateIntakeQuestions(payload) {
  try {
    const response = await spellpathPost('/api/intake', payload);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to generate intake questions');
    }

    return await response.json();
  } catch (err) {
    console.error('Intake generation failed, falling back to mock:', err);
    return mockIntakeQuestions(payload);
  }
}

export async function generateScaffold(payload) {
  try {
    const response = await spellpathPost('/api/scaffold', payload);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to generate scaffold');
    }

    return await response.json();
  } catch (err) {
    console.error('Scaffold generation failed, falling back to mock:', err);
    return mockScaffold(payload);
  }
}

export async function generateBeat(payload) {
  try {
    const response = await spellpathPost('/api/beat', payload);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to generate beat');
    }

    return normalizeBeatClient(await response.json());
  } catch (err) {
    console.error('Beat generation failed, falling back to mock:', err);
    return normalizeBeatClient(mockBeat(payload));
  }
}
