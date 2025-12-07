import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();


const app = express();
const port = process.env.PORT || 4000;

const openaiApiKey = process.env.OPENAI_API_KEY;

// Optional: quick sanity check. This will log just true/false, not the key itself.
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

const systemPrompt = `
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
Tone and imagery should match the genre and mode (day/night). Keep content safe and concise.`;

app.post('/api/generate', async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).send('OPENAI_API_KEY is not set on the server.');
    }

    const { subject, genre, mode, answers } = req.body || {};
    if (!subject || !genre || !mode) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: subject, genre, mode' });
    }

    const level =
      answers?.find(a => a.questionId === 1)?.answer ||
      answers?.[0]?.answer ||
      'beginner';

    const userPrompt = JSON.stringify({
      subject,
      genre,
      mode,
      level,
      answers: answers || [],
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.6,
      max_tokens: 500,
      messages: [
        { role: 'system', content: systemPrompt.trim() },
        { role: 'user', content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: 'No content returned from model' });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch  {
      return res.status(500).json({ error: 'Failed to parse model response' });
    }

    return res.json(parsed);
  } catch (err) {
    console.error('Generation error:', err);
    res.status(500).json({ error: 'Generation failed' });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(port, () => {
  console.log(`SpellPath API running on http://localhost:${port}`);
});
