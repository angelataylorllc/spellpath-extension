const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

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
        narrativeHint: `Introduce ${subject} through a compelling scene in the ${genre} world.`,
        checkpointFocus: `Identify the main idea of ${subject}`,
        flexibility: 'rigid',
      },
      {
        id: 'beat_2',
        title: 'Deeper Look',
        concept: `Key mechanism of ${subject}`,
        narrativeHint: `Explore how ${subject} works using genre-specific imagery.`,
        checkpointFocus: `Explain how the core mechanism works`,
        flexibility: 'rigid',
      },
      {
        id: 'beat_3',
        title: 'Apply It',
        concept: `Practical application of ${subject}`,
        narrativeHint: `The protagonist uses ${subject} to solve a challenge.`,
        checkpointFocus: `Apply ${subject} in a concrete scenario`,
        flexibility: 'soft',
      },
    ],
    estimatedBeats: 3,
    difficultyArc: `${level} -> ${level === 'advanced' ? 'advanced' : 'intermediate'}`,
  };
}

function mockBeat({ currentBeat, learnerProfile }) {
  const concept = currentBeat?.concept || 'this concept';
  const level = learnerProfile?.level || 'beginner';

  return {
    narrative: `You encounter a challenge that reveals the essence of ${concept}. ` +
      `As a ${level} learner, this is the perfect place to start building understanding.\n\n` +
      `The world around you shifts, illustrating ${concept} in vivid detail. ` +
      `Take a moment to absorb what you see before the checkpoint ahead.`,
    checkpoint: {
      question: `Which of the following best describes ${concept}?`,
      options: [
        { label: `A clear and accurate description of ${concept}`, correct: true },
        { label: `A common misconception about ${concept}`, correct: false },
        { label: `An unrelated idea`, correct: false },
      ],
      hint: `Think about the core principle behind ${concept}.`,
    },
    beatSummary: `Introduced ${concept} at the ${level} level.`,
    scaffoldAdjustment: null,
  };
}

function mockIntakeQuestions({ subject }) {
  return {
    questions: [
      {
        id: 'ai_1',
        text: `Which of these terms related to ${subject} sounds most familiar?`,
        type: 'choice',
        choices: [
          { label: 'None of them ring a bell', value: 'none' },
          { label: 'I recognize some but can\'t explain them', value: 'recognize' },
          { label: 'I could explain most of them', value: 'explain' },
        ],
      },
      {
        id: 'ai_2',
        text: `The most fundamental idea behind ${subject} is ___`,
        type: 'fill_blank',
        placeholder: 'your best guess...',
      },
      {
        id: 'ai_3',
        text: `What do you already know about ${subject}? Anything at all is great.`,
        type: 'textarea',
        placeholder: 'No wrong answers here...',
      },
      {
        id: 'ai_4',
        text: `What specific questions do you have about ${subject}?`,
        type: 'textarea',
        placeholder: 'What are you most curious about?',
      },
      {
        id: 'ai_5',
        text: `Does this tie into a larger project or plan? If so, briefly describe it.`,
        type: 'textarea',
        placeholder: 'e.g., a school project, a personal goal, building something...',
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function generateIntakeQuestions(payload) {
  try {
    const response = await fetch(`${API_BASE}/api/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

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
    const response = await fetch(`${API_BASE}/api/scaffold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

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
    const response = await fetch(`${API_BASE}/api/beat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to generate beat');
    }

    return await response.json();
  } catch (err) {
    console.error('Beat generation failed, falling back to mock:', err);
    return mockBeat(payload);
  }
}
