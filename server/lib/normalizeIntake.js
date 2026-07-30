/**
 * Post-process AI intake questions: enforce Phase 1 limits (2–3 questions,
 * no fill_blank, at most one textarea) and drop genre/storytelling leakage.
 */

/** Questions about fiction craft, not the learner's subject. */
const GENRE_LEAK_RE =
  /\b(fantasy world|storytelling|story style|plot twist|world-?building|magic system|sci-?fi setting|mystery genre|horror atmosphere|adventure story|narrative structure|character development|literary|fiction writing|choose-?your-?own)\b/i;

function mentionsSubject(text, subject) {
  if (!text || !subject) return false;
  return text.toLowerCase().includes(subject.trim().toLowerCase());
}

function isGenreLeakQuestion(text, subject) {
  if (!text) return true;
  if (mentionsSubject(text, subject)) return false;
  return GENRE_LEAK_RE.test(text);
}

export function fallbackSubjectQuestions(subject, { skipGoalsTextarea = false } = {}) {
  const s = subject || 'this topic';
  const questions = [
    {
      id: 'ai_1',
      text: `Which best describes your familiarity with ${s}?`,
      type: 'choice',
      choices: [
        { label: 'Never heard of it', value: 'none' },
        { label: 'Heard of it but can\'t explain it', value: 'recognize' },
        { label: 'Could explain the basics', value: 'explain' },
      ],
    },
    {
      id: 'ai_2',
      text: `Which aspect of ${s} interests you most right now?`,
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
      text: `What do you want to learn or accomplish with ${s}? (optional)`,
      type: 'textarea',
      placeholder: 'e.g., pass a test, build something, understand a specific feature...',
    });
  }

  return questions;
}

export function normalizeIntakeResponse(parsed, { subject, learningGoals } = {}) {
  const goalsProvided = Boolean(String(learningGoals || '').trim());
  const raw = Array.isArray(parsed?.questions) ? parsed.questions : [];
  let textareaCount = 0;

  let questions = raw
    .filter(q => q && typeof q === 'object' && q.type !== 'fill_blank')
    .filter(q => {
      if (goalsProvided && q.type === 'textarea') return false;
      if (subject && q.type !== 'textarea' && isGenreLeakQuestion(q.text, subject)) {
        return false;
      }
      if (q.type === 'textarea') {
        textareaCount += 1;
        return textareaCount <= 1;
      }
      return true;
    })
    .slice(0, goalsProvided ? 2 : 3)
    .map((q, i) => ({
      ...q,
      id: q.id || `ai_${i + 1}`,
      type: q.type === 'textarea' ? 'textarea' : q.type === 'text' ? 'text' : 'choice',
    }));

  const choiceCount = questions.filter(q => q.type === 'choice').length;
  const minChoices = goalsProvided ? 2 : 2;
  if (subject && (questions.length < minChoices || choiceCount < minChoices)) {
    questions = fallbackSubjectQuestions(subject, { skipGoalsTextarea: goalsProvided });
  }

  return { questions };
}
