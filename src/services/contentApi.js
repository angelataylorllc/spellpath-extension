const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

// Fallback mock so the UI still works without the backend.
const mockContent = ({ subject, genre, mode, answers }) => {
  const level =
    answers?.find(a => a.questionId === 1)?.answer ||
    answers?.[0]?.answer ||
    'beginner';

  const vibeMap = {
    scifi: 'sleek sci-fi decks',
    fantasy: 'arcane tomes and glowing runes',
    mystery: 'noir case files',
    horror: 'eerie whispers and candlelight',
    adventure: 'treasure maps and compass roses',
  };

  const mood = mode === 'night' ? 'at night under starlight' : 'in bright daylight';

  return {
    subject,
    level,
    overview: `A ${level} journey into ${subject}, styled like ${vibeMap[genre] || 'your chosen world'} ${mood}.`,
    sections: [
      {
        title: 'Beat 1: Hook',
        body: `You encounter the core idea of ${subject}. Explain it in two sentences suited for a ${level}.`,
        quiz: {
          question: `Which phrase best describes the main idea of ${subject}?`,
          options: [
            `A simple summary of ${subject}`,
            `A complex tangent unrelated to ${subject}`,
            `A misleading statement`,
          ],
          answer: 0,
        },
      },
      {
        title: 'Beat 2: Apply',
        body: `Apply ${subject} in a concrete example. Use imagery from ${vibeMap[genre] || 'this theme'}.`,
        quiz: {
          question: `Which example correctly applies ${subject}?`,
          options: [
            `An example aligned with ${subject}`,
            `An unrelated anecdote`,
            `Purely decorative flavor with no concept`,
          ],
          answer: 0,
        },
      },
    ],
    summary: `You now have a themed primer on ${subject}. Continue with more beats or deepen difficulty next.`,
  };
};

export async function generateContent(payload) {
  try {
    const response = await fetch(`${API_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to generate content');
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Content generation failed, falling back to mock:', err);
    // Fallback to mock so the UI still renders something.
    return mockContent(payload);
  }
}
