import { useState, useEffect, useRef } from 'react';
import '../index.css';
import '../styles/theme-tokens.css';
import { STORY_GENRES } from '../config/genres';
import { useTheme } from '../contexts/ThemeContext';
import { Settings } from './Settings';
import { generateContent } from '../services/contentApi';

function App() {
  const { mode, toggleMode, setTheme } = useTheme();
  const [subject, setSubject] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentPhase, setCurrentPhase] = useState("input"); // input, quiz, story
  const [quizData, setQuizData] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const userAnswersRef = useRef(userAnswers);
  const [showSettings, setShowSettings] = useState(false);
  const [storyData, setStoryData] = useState(null);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const STORAGE_KEY = 'spellpath-latest-run';

  const handleGenreSelect = (genreId) => {
    setSelectedGenre(genreId);
    // Also set the theme when a genre is selected
    const genre = STORY_GENRES.find(g => g.id === genreId);
    if (genre && genre.theme) {
      setTheme(genre.theme);
    }
    // Reset quiz progression when switching genres
    setCurrentQuestion(0);
    setUserAnswers([]);
  };

  const handleSubjectSubmit = (e) => {
    e.preventDefault();
    if (subject.trim() && selectedGenre) {
      // Reset state for a fresh quiz run
      setCurrentQuestion(0);
      setUserAnswers([]);
      setQuizData(null);
      setStoryData(null);
      setGenerationError(null);

      setIsAnalyzing(true);

      // Simulate AI analysis and quiz generation
      setTimeout(() => {
        const generatedQuiz = generateAdaptiveQuiz(subject, selectedGenre);
        setQuizData(generatedQuiz);
        setCurrentPhase("quiz");
        setIsAnalyzing(false);
      }, 2000);
    }
  };

  const generateAdaptiveQuiz = (subject, genre) => {
    // Placeholder: will be AI-generated later
    return {
      subject: subject,
      genre: genre,
      questions: [
        {
          id: 1,
          text: `What's your experience level with ${subject}?`,
          type: 'difficulty_assessment',
          choices: [
            { label: "Complete beginner", value: "beginner", next: 2 },
            { label: "Some knowledge", value: "intermediate", next: 3 },
            { label: "Quite experienced", value: "advanced", next: 4 }
          ]
        },
        {
          id: 2,
          text: `Let's start with the basics of ${subject}. What do you think this concept means?`,
          type: 'concept_check',
          difficulty: 'beginner',
          choices: [
            { label: "I'm not sure", value: "unknown", next: 5 },
            { label: "I have some idea", value: "partial", next: 6 }
          ]
        },
        // More questions will be generated based on previous answers
      ]
    };
  };

  const handleQuizAnswer = (answer, questionId) => {
    const newAnswers = [...userAnswers, { questionId, answer }];
    setUserAnswers(newAnswers);

    const currentQ = quizData.questions.find(q => q.id === questionId);
    const selectedChoice = currentQ?.choices.find(c => c.value === answer);

    const nextQuestionId = selectedChoice?.next;
    if (!nextQuestionId) {
      startContentGeneration(newAnswers);
      return;
    }

    const nextIndex = quizData.questions.findIndex(q => q.id === nextQuestionId);
    if (nextIndex === -1) {
      // Fallback: if we don't have a matching question, finish gracefully.
      setCurrentPhase("story");
      return;
    }

    setCurrentQuestion(nextIndex);
  };

  const startContentGeneration = async (answersSnapshot = userAnswers) => {
    setGenerationError(null);
    setStoryData(null);
    setIsGeneratingContent(true);
    setCurrentPhase("story");

    try {
      const payload = {
        subject,
        genre: selectedGenre,
        mode,
        answers: answersSnapshot,
      };
      const content = await generateContent(payload);
      setStoryData(content);
    } catch (error) {
      setGenerationError(error?.message || 'Failed to generate content. Please try again.');
    } finally {
      setIsGeneratingContent(false);
    }
  };

  // Keep ref in sync with userAnswers
  useEffect(() => {
    userAnswersRef.current = userAnswers;
  }, [userAnswers]);

  // Safety: if we ever land on the story phase without data, kick off generation.
  useEffect(() => {
    if (currentPhase === "story" && quizData && !storyData && !isGeneratingContent && !generationError) {
      startContentGeneration(userAnswersRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase, quizData]);

  // Persist last run (story view) in localStorage
  useEffect(() => {
    if (!storyData) return;
    const payload = {
      subject,
      selectedGenre,
      storyData,
      generationError,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [storyData, generationError, subject, selectedGenre]);

  // Restore last run on load
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed.subject) setSubject(parsed.subject);
      if (parsed.selectedGenre) {
        setSelectedGenre(parsed.selectedGenre);
        const genre = STORY_GENRES.find(g => g.id === parsed.selectedGenre);
        if (genre?.theme) setTheme(genre.theme);
      }
      if (parsed.storyData) {
        setStoryData(parsed.storyData);
        setGenerationError(parsed.generationError || null);
        setCurrentPhase("story");
      }
    } catch {
      // ignore corrupt data
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // INPUT PHASE
  if (currentPhase === "input") {
    return (
      <>
        <main className="scene">
          <div className="scene__content">
            <div className="mb-6 relative text-center sm:text-left">
              {/* Day/Night Toggle - Always visible */}
              <div className="absolute top-0 right-0 flex items-center gap-2">
                <button
                  onClick={toggleMode}
                  className="p-2 rounded-lg transition-all hover:scale-110"
                  style={{ 
                    backgroundColor: 'var(--color-accent-soft)',
                    color: 'var(--color-text)',
                    border: '2px solid var(--color-accent)'
                  }}
                  aria-label={`Switch to ${mode === 'day' ? 'night' : 'day'} mode`}
                  title={`Switch to ${mode === 'day' ? 'night' : 'day'} mode`}
                >
                  {mode === 'day' ? '🌙' : '☀️'}
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 rounded-lg transition-all hover:scale-110"
                  style={{ 
                    backgroundColor: 'var(--color-accent-soft)',
                    color: 'var(--color-text)',
                    border: '2px solid var(--color-accent)'
                  }}
                  aria-label="Open settings"
                  title="Settings"
                >
                  ⚙️
                </button>
              </div>
              <h1 className="text-3xl font-bold mb-2 tracking-wide genre-title">StoryPath</h1>
              <p className="text-base opacity-80">Choose your learning adventure</p>
            </div>

          <form onSubmit={handleSubjectSubmit} className="space-y-6">
            <div className="genre-card p-4 rounded-lg border">
              <label className="block text-sm font-medium mb-3">
                What would you like to learn?
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., quantum physics, medieval cooking, JavaScript..."
                className="w-full px-4 py-3 genre-input rounded-lg focus:outline-none"
                disabled={isAnalyzing}
              />
            </div>

            <div className="genre-card p-4 rounded-lg border">
              <label className="block text-sm font-medium mb-3">
                Choose your story style
              </label>
              <div className="grid grid-cols-1 gap-3">
                {STORY_GENRES.map(genre => (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => handleGenreSelect(genre.id)}
                    className="p-4 rounded-lg border-2 transition-all duration-300 text-left"
                    style={{
                      borderColor: selectedGenre === genre.id 
                        ? 'var(--color-accent)' 
                        : 'var(--color-accent-soft)',
                      backgroundColor: selectedGenre === genre.id 
                        ? 'var(--color-accent-soft)' 
                        : 'var(--color-bg-alt)',
                      boxShadow: selectedGenre === genre.id ? '0 4px 6px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{genre.icon}</span>
                      <div>
                        <div className="font-semibold" style={{ color: 'var(--color-text)' }}>
                          {genre.name}
                        </div>
                        <div className="text-sm opacity-80" style={{ color: 'var(--color-text-muted)' }}>
                          {genre.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!subject.trim() || !selectedGenre || isAnalyzing}
              className="w-full genre-button px-6 py-3 rounded-lg text-base font-medium"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-bg)',
                opacity: (!subject.trim() || !selectedGenre || isAnalyzing) ? 0.5 : 1,
                cursor: (!subject.trim() || !selectedGenre || isAnalyzing) ? 'not-allowed' : 'pointer',
              }}
            >
              {isAnalyzing ? "Analyzing topic and creating quiz..." : "Begin Your Adventure"}
            </button>
          </form>
        </div>
      </main>
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      </>
    );
  }

  // QUIZ PHASE
  if (currentPhase === "quiz" && quizData) {
    const question = quizData.questions[currentQuestion];
    const currentGenre = STORY_GENRES.find(g => g.id === quizData.genre);

    return (
      <>
      <main className="scene">
        <div className="scene__content">
          <div className="mb-6 relative text-center sm:text-left">
            {/* Day/Night Toggle and Settings */}
            <div className="absolute top-0 right-0 flex items-center gap-2">
              <button
                onClick={toggleMode}
                className="p-2 rounded-lg transition-all hover:scale-110"
                style={{ 
                  backgroundColor: 'var(--color-accent-soft)',
                  color: 'var(--color-text)',
                  border: '2px solid var(--color-accent)'
                }}
                aria-label={`Switch to ${mode === 'day' ? 'night' : 'day'} mode`}
                title={`Switch to ${mode === 'day' ? 'night' : 'day'} mode`}
              >
                {mode === 'day' ? '🌙' : '☀️'}
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg transition-all hover:scale-110"
                style={{ 
                  backgroundColor: 'var(--color-accent-soft)',
                  color: 'var(--color-text)',
                  border: '2px solid var(--color-accent)'
                }}
                aria-label="Open settings"
                title="Settings"
              >
                ⚙️
              </button>
            </div>
            <button
              onClick={() => setCurrentPhase("input")}
              className="text-sm mb-3 flex items-center space-x-1 opacity-90 hover:opacity-100"
              style={{ color: 'var(--color-text)' }}
            >
              <span>←</span>
              <span>Choose different topic</span>
            </button>
            <div className="genre-card p-3 rounded-lg">
              <p className="text-xs opacity-80">
                Learning: <span className="font-medium">{quizData.subject}</span> |{" "}
                Style: <span className="font-medium">{currentGenre?.name}</span>
              </p>
            </div>
          </div>

          <div className="genre-card p-6 rounded-lg mb-6">
            <p className="text-sm opacity-80 mb-3">
              Question {currentQuestion + 1} of {quizData.questions.length}
            </p>
            <p className="text-lg font-medium mb-6">{question.text}</p>

            <div className="flex flex-col gap-3">
              {question.choices.map((choice, i) => (
                <button
                  key={i}
                  onClick={() => handleQuizAnswer(choice.value, question.id)}
                  className="w-full genre-button px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'var(--color-bg)',
                  }}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      </>
    );
  }

  // STORY PHASE
  if (currentPhase === "story" && (quizData || storyData)) {
    return (
      <>
      <main className="scene">
        <div className="scene__content">
          <div className="mb-6 relative text-center sm:text-left">
            {/* Day/Night Toggle and Settings */}
            <div className="absolute top-0 right-0 flex items-center gap-2">
              <button
                onClick={toggleMode}
                className="p-2 rounded-lg transition-all hover:scale-110"
                style={{ 
                  backgroundColor: 'var(--color-accent-soft)',
                  color: 'var(--color-text)',
                  border: '2px solid var(--color-accent)'
                }}
                aria-label={`Switch to ${mode === 'day' ? 'night' : 'day'} mode`}
                title={`Switch to ${mode === 'day' ? 'night' : 'day'} mode`}
              >
                {mode === 'day' ? '🌙' : '☀️'}
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg transition-all hover:scale-110"
                style={{ 
                  backgroundColor: 'var(--color-accent-soft)',
                  color: 'var(--color-text)',
                  border: '2px solid var(--color-accent)'
                }}
                aria-label="Open settings"
                title="Settings"
              >
                ⚙️
              </button>
            </div>
          </div>

          <div className="genre-card p-6 rounded-lg mb-6 text-left space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold genre-title">Your Story Begins!</h2>
              {storyData && (
                <button
                  onClick={() => startContentGeneration()}
                  className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'var(--color-bg)',
                    border: '1px solid var(--color-accent)',
                  }}
                >
                  Regenerate
                </button>
              )}
            </div>

            {isGeneratingContent && (
              <p className="text-base opacity-80">Building your tailored path...</p>
            )}

            {generationError && (
              <div className="space-y-3">
                <p className="text-sm text-red-200">{generationError}</p>
                <button
                  onClick={() => startContentGeneration()}
                  className="genre-button px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-bg)' }}
                >
                  Retry
                </button>
              </div>
            )}

            {storyData && !isGeneratingContent && !generationError && (
              <div className="space-y-4">
                <p className="text-base">{storyData.overview}</p>
                <div className="space-y-3">
                  {storyData.sections?.map((section, idx) => (
                    <div key={idx} className="p-4 rounded-lg border" style={{ borderColor: 'var(--color-accent-soft)' }}>
                      <h3 className="text-lg font-semibold genre-title mb-2">{section.title}</h3>
                      <p className="text-sm mb-3">{section.body}</p>
                      {section.quiz && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Checkpoint:</p>
                          <p className="text-sm">{section.quiz.question}</p>
                          <ul className="text-sm list-disc list-inside space-y-1 opacity-80">
                            {section.quiz.options?.map((opt, i) => (
                              <li key={i}>{opt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm opacity-80">{storyData.summary}</p>
                <button
                  onClick={() => {
                    setCurrentPhase("input");
                    setCurrentQuestion(0);
                    setUserAnswers([]);
                    setQuizData(null);
                    setSubject("");
                    setSelectedGenre("");
                    setStoryData(null);
                    setGenerationError(null);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: 'var(--color-bg-alt)',
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-accent-soft)',
                  }}
                >
                  Start New Adventure
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      </>
    );
  }

  return null;
}

export default App;
