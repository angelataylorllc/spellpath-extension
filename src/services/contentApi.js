import {
  DEFAULT_MODELS,
  getLLMCredentials,
  PROVIDER_KEY_HINTS,
  PROVIDER_LABELS,
  LLM_PROVIDERS,
} from './apiCredentials';
import { normalizeQuotes } from '../../lib/normalizeQuotes.js';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const SPELLPATH_PROVIDER_HEADER = 'X-SpellPath-Provider';
const SPELLPATH_API_KEY_HEADER = 'X-SpellPath-Api-Key';
const SPELLPATH_OPENAI_BYOK_HEADER = 'X-SpellPath-OpenAI-Key';

async function parseApiError(response) {
  const errorText = await response.text();
  try {
    const parsed = JSON.parse(errorText);
    if (parsed?.error) return parsed.error;
  } catch {
    // not JSON
  }
  return errorText || `Request failed (${response.status})`;
}

function wrapFetchError(err) {
  if (err instanceof TypeError || /failed to fetch|networkerror/i.test(String(err?.message || ''))) {
    return new Error(
      'Cannot reach SpellPath API. Run npm run api (port 4000), then reload the extension.',
    );
  }
  return err;
}

/**
 * POST to SpellPath API; attaches active BYOK provider + key from chrome.storage.local.
 */
async function spellpathPost(path, body) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const creds = await getLLMCredentials().catch(() => undefined);

  if (creds?.apiKey) {
    headers.set(SPELLPATH_PROVIDER_HEADER, creds.provider);
    headers.set(SPELLPATH_API_KEY_HEADER, creds.apiKey);
    if (creds.provider === 'openai') {
      headers.set(SPELLPATH_OPENAI_BYOK_HEADER, creds.apiKey);
    }
  }

  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

export { LLM_PROVIDERS, PROVIDER_LABELS, DEFAULT_MODELS, PROVIDER_KEY_HINTS };

// ---------------------------------------------------------------------------
// Mock fallbacks — intake only (when API unreachable); never used for story beats
// ---------------------------------------------------------------------------

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
      throw new Error(await parseApiError(response));
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
      throw new Error(await parseApiError(response));
    }

    return await response.json();
  } catch (err) {
    throw wrapFetchError(err);
  }
}

export async function generateBeat(payload) {
  try {
    const response = await spellpathPost('/api/beat', payload);

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    return normalizeBeatClient(await response.json());
  } catch (err) {
    throw wrapFetchError(err);
  }
}
