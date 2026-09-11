import { useState, useEffect } from 'react';
import '../index.css';
import '../styles/theme-tokens.css';
import '../styles/adventure-campfire.css';
import '../styles/adventure-wind.css';
import { STORY_GENRES } from '../config/genres';
import { AUTHOR_EXAMPLES } from '../config/genreVoice';
import { LEARNING_FOCUS_OPTIONS } from '../config/learningFocus';
import { useTheme } from '../contexts/ThemeContext';
import { Settings } from './Settings';
import { LoginGate } from './LoginGate';
import Toolbar from './Toolbar';
import { useAuth } from '../contexts/AuthContext';
import SceneAtmosphere from './SceneAtmosphere';
import IntakeQuestion from './IntakeQuestion';
import StoryBeat from '../stories/StoryBeat';
import { useStory, STORY_PHASES } from '../stories/useStory';
import {
  buildSessionArchive,
  downloadStoryJson,
  openStoryPdf,
  persistSessionLog,
} from '../stories/storyExport';
import { generateIntakeQuestions, validateTopic } from '../services/contentApi';
import {
  validateTopicClient,
  TOPIC_REJECT_MESSAGE,
  HERITAGE_ACCEPT_NOTE,
  NICHE_ACCEPT_NOTE,
} from '../lib/validateTopicClient';

function App() {
  const { mode, setTheme } = useTheme();
  const { authEnabled, user, loading: authLoading, error: authError, signIn, signOut } = useAuth();
  const [subject, setSubject] = useState('');
  const [learningGoals, setLearningGoals] = useState('');
  const [learningFocus, setLearningFocus] = useState('');
  const [authorStyle, setAuthorStyle] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Intake quiz state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  // UI phase: input | validating_topic | topic_reject | topic_clarify | quiz | quiz_loading | scaffolding | story | complete
  const [uiPhase, setUiPhase] = useState('input');
  const [topicCategory, setTopicCategory] = useState('standard');
  const [topicValidation, setTopicValidation] = useState(null);
  const [topicAcceptNote, setTopicAcceptNote] = useState(null);
  const [clarifyAttempts, setClarifyAttempts] = useState(0);
  const [topicGateError, setTopicGateError] = useState(null);
  const [authorStyleWarning, setAuthorStyleWarning] = useState(null);
  const [pendingTopicResult, setPendingTopicResult] = useState(null);

  // Story engine hook
  const {
    phase: enginePhase,
    scaffold,
    learnerProfile,
    currentBeatData,
    beatIndex,
    totalBeats,
    storySoFar,
    isLoading,
    loadingMessage,
    error,
    adaptationNotice,
    initScaffold,
    submitCheckpoint,
    continueStory,
    reset: resetEngine,
  } = useStory();

  // Whether the user has answered the current checkpoint (waiting for "Continue")
  const [checkpointAnswered, setCheckpointAnswered] = useState(false);
  const [sessionLogged, setSessionLogged] = useState(false);

  const buildArchive = () =>
    buildSessionArchive({
      subject,
      genre: selectedGenre,
      mode,
      level: learnerProfile?.level,
      learningGoals,
      learningFocus,
      authorStyle,
      scaffold,
      completedBeats: storySoFar,
      learnerProfile,
      intakeAnswers: userAnswers,
    });

  useEffect(() => {
    if (enginePhase !== STORY_PHASES.COMPLETE || storySoFar.length === 0 || sessionLogged) return;

    const archive = buildSessionArchive({
      subject,
      genre: selectedGenre,
      mode,
      level: learnerProfile?.level,
      learningGoals,
      learningFocus,
      authorStyle,
      scaffold,
      completedBeats: storySoFar,
      learnerProfile,
      intakeAnswers: userAnswers,
    });
    persistSessionLog(archive);
    setSessionLogged(true);
  }, [
    enginePhase,
    storySoFar,
    sessionLogged,
    subject,
    selectedGenre,
    mode,
    learnerProfile,
    scaffold,
    userAnswers,
    learningGoals,
    learningFocus,
  ]);

  // Keep data-theme in sync with selected genre across quiz → story flow
  useEffect(() => {
    if (!selectedGenre) return;
    const genre = STORY_GENRES.find(g => g.id === selectedGenre);
    if (genre?.theme) setTheme(genre.theme);
  }, [selectedGenre, uiPhase, setTheme]);

  // --- Handlers ---

  const handleGenreSelect = (genreId) => {
    setSelectedGenre(genreId);
    const genre = STORY_GENRES.find(g => g.id === genreId);
    if (genre?.theme) setTheme(genre.theme);
    setCurrentQuestion(0);
    setUserAnswers([]);
  };

  const UNIVERSAL_QUESTION_COUNT = 3;

  const proceedToQuiz = (topicLabel) => {
    const label = topicLabel || subject;
    setCurrentQuestion(0);
    setUserAnswers([]);
    const quiz = buildUniversalQuiz(label, selectedGenre);
    setQuizData(quiz);
    setUiPhase('quiz');
    setIsAnalyzing(false);
  };

  const acceptTopicValidation = (result) => {
    const normalized = result.normalizedSubject?.trim();
    if (normalized && normalized.toLowerCase() !== subject.trim().toLowerCase()) {
      setSubject(normalized);
    }

    setTopicCategory(result.category || 'standard');
    setTopicValidation(null);
    setTopicGateError(null);
    setPendingTopicResult(null);
    setAuthorStyleWarning(null);

    if (result.category === 'heritage') {
      setTopicAcceptNote(HERITAGE_ACCEPT_NOTE);
    } else if (result.category === 'niche') {
      setTopicAcceptNote(NICHE_ACCEPT_NOTE);
    } else {
      setTopicAcceptNote(null);
    }

    proceedToQuiz(normalized || subject);
  };

  const maybeAcceptTopicValidation = (result) => {
    if (
      authorStyle.trim()
      && result.authorStyleCheck?.status === 'warn'
      && result.authorStyleCheck?.reason
    ) {
      setPendingTopicResult(result);
      setAuthorStyleWarning(result.authorStyleCheck);
      setUiPhase('topic_author_warn');
      setIsAnalyzing(false);
      return;
    }

    acceptTopicValidation(result);
  };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !selectedGenre) return;

    setTopicGateError(null);
    setTopicValidation(null);

    const clientCheck = validateTopicClient(subject);
    if (!clientCheck.ok) {
      setTopicValidation({
        status: 'reject',
        reason: clientCheck.reason || TOPIC_REJECT_MESSAGE,
      });
      setUiPhase('topic_reject');
      return;
    }

    setIsAnalyzing(true);
    setUiPhase('validating_topic');

    try {
      const result = await validateTopic({
        subject: subject.trim(),
        genre: selectedGenre,
        learningGoals: learningGoals.trim(),
        learningFocus: learningFocus || '',
        authorStyle: authorStyle.trim(),
      });

      if (result.status === 'reject') {
        setTopicValidation(result);
        setUiPhase('topic_reject');
        setIsAnalyzing(false);
        return;
      }

      if (result.status === 'clarify' && !learningGoals.trim() && clarifyAttempts < 2) {
        setTopicValidation(result);
        setClarifyAttempts(prev => prev + 1);
        setUiPhase('topic_clarify');
        setIsAnalyzing(false);
        return;
      }

      maybeAcceptTopicValidation(result);
    } catch (err) {
      setTopicGateError(
        err?.message || 'Could not verify this topic right now. Check that npm run api is running.',
      );
      setUiPhase('input');
      setIsAnalyzing(false);
    }
  };

  const handleClarifyResubmit = (e) => {
    e.preventDefault();
    if (!subject.trim()) return;

    const clientCheck = validateTopicClient(subject);
    if (!clientCheck.ok) {
      setTopicValidation({
        status: 'reject',
        reason: clientCheck.reason || TOPIC_REJECT_MESSAGE,
      });
      setUiPhase('topic_reject');
      return;
    }

    if (clarifyAttempts >= 2 || learningGoals.trim().length >= 12) {
      acceptTopicValidation({
        status: 'accept',
        category: topicValidation?.category || topicCategory || 'standard',
        normalizedSubject: subject.trim(),
        authorStyleCheck: { status: 'skip' },
      });
      return;
    }

    handleSubjectSubmit(e);
  };

  const buildUniversalQuiz = (subj, genre) => ({
    subject: subj,
    genre,
    questions: [
      {
        id: 'u_1',
        text: 'What is your age range?',
        type: 'choice',
        choices: [
          { label: 'Under 13', value: 'under_13' },
          { label: '13–17', value: '13_17' },
          { label: '18–24', value: '18_24' },
          { label: '25–44', value: '25_44' },
          { label: '45–64', value: '45_64' },
          { label: '65 or older', value: '65_plus' },
        ],
      },
      {
        id: 'u_2',
        text: `What's your experience level with ${subj}?`,
        type: 'choice',
        choices: [
          { label: 'Complete beginner', value: 'beginner' },
          { label: 'Some knowledge', value: 'intermediate' },
          { label: 'Quite experienced', value: 'advanced' },
        ],
      },
      {
        id: 'u_3',
        text: `Why are you curious about ${subj}?`,
        type: 'choice',
        choices: [
          { label: 'Just curious', value: 'curious' },
          { label: 'School / coursework', value: 'school' },
          { label: 'Work / project', value: 'work' },
          { label: 'Building something specific', value: 'building' },
          { label: 'Deep personal interest', value: 'passion' },
        ],
      },
    ],
  });

  const handleQuizAnswer = async (answer, questionId) => {
    const newAnswers = [...userAnswers, { questionId, answer }];
    setUserAnswers(newAnswers);

    const nextIndex = currentQuestion + 1;

    // After the last universal question, fetch AI-generated questions
    if (nextIndex === UNIVERSAL_QUESTION_COUNT && quizData.questions.length === UNIVERSAL_QUESTION_COUNT) {
      setUiPhase('quiz_loading');

      const age = newAnswers.find(a => a.questionId === 'u_1')?.answer || 'unknown';
      const level = newAnswers.find(a => a.questionId === 'u_2')?.answer || 'beginner';
      const motivation = newAnswers.find(a => a.questionId === 'u_3')?.answer || 'curious';

      try {
        const result = await generateIntakeQuestions({
          subject,
          genre: selectedGenre,
          age,
          level,
          motivation,
          learningGoals: learningGoals.trim(),
          learningFocus: learningFocus || 'general',
        });

        const aiQuestions = result?.questions || [];
        setQuizData(prev => ({
          ...prev,
          questions: [...prev.questions, ...aiQuestions],
        }));
        setCurrentQuestion(nextIndex);
        setUiPhase('quiz');
      } catch {
        // If AI questions fail, skip to scaffold with what we have
        setCurrentQuestion(nextIndex);
        finishQuiz(newAnswers);
      }
      return;
    }

    // More questions to go
    if (nextIndex < quizData.questions.length) {
      setCurrentQuestion(nextIndex);
      return;
    }

    // All questions done — start scaffold
    finishQuiz(newAnswers);
  };

  const finishQuiz = (answers) => {
    const age = answers.find(a => a.questionId === 'u_1')?.answer || 'unknown';
    const level = answers.find(a => a.questionId === 'u_2')?.answer || 'beginner';
    const motivation = answers.find(a => a.questionId === 'u_3')?.answer || 'curious';
    setUiPhase('scaffolding');
    setCheckpointAnswered(false);

    initScaffold({
      subject,
      genre: selectedGenre,
      mode,
      level,
      age,
      motivation,
      learningGoals: learningGoals.trim(),
      learningFocus: learningFocus || 'general',
      topicCategory,
      authorStyle: authorStyle.trim(),
      answers,
    })
      .then(() => {
        setUiPhase('story');
      })
      .catch(() => {
        // error state lives on useStory; stay on scaffolding screen
      });
  };

  const handleCheckpointAnswer = ({ selectedIndex, correct }) => {
    submitCheckpoint({ selectedIndex, correct });
    setCheckpointAnswered(true);
  };

  const handleContinue = async () => {
    setCheckpointAnswered(false);
    await continueStory();
  };

  const handleStartOver = () => {
    resetEngine();
    setSessionLogged(false);
    setSubject('');
    setLearningGoals('');
    setLearningFocus('');
    setSelectedGenre('');
    setQuizData(null);
    setCurrentQuestion(0);
    setUserAnswers([]);
    setCheckpointAnswered(false);
    setTopicCategory('standard');
    setTopicValidation(null);
    setTopicAcceptNote(null);
    setClarifyAttempts(0);
    setTopicGateError(null);
    setAuthorStyleWarning(null);
    setPendingTopicResult(null);
    setAuthorStyle('');
    setUiPhase('input');
  };

  // --- Render helpers ---

  if (authEnabled && authLoading) {
    return (
      <main className="scene">
        <SceneAtmosphere />
        <div className="scene__content ui-font text-center">
          <p className="ui-subtitle">Checking sign-in…</p>
        </div>
      </main>
    );
  }

  if (authEnabled && !user) {
    return (
      <LoginGate
        onSignIn={() => signIn().catch(() => {})}
        loading={authLoading}
        error={authError}
      />
    );
  }

  const toolbarAuthProps = authEnabled ? { user, onSignOut: signOut } : {};

  const settingsModal = showSettings && <Settings onClose={() => setShowSettings(false)} />;

  const progressBar = totalBeats > 0 && (
    <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{
          width: `${((beatIndex + (checkpointAnswered ? 1 : 0)) / totalBeats) * 100}%`,
          backgroundColor: 'var(--color-accent)',
        }}
      />
    </div>
  );

  // =======================================================================
  // INPUT PHASE
  // =======================================================================
  if (uiPhase === 'input') {
    return (
      <>
        <main className="scene">
          <SceneAtmosphere />
          <div className="scene__content scene__content--intake ui-font">
            <div className="mb-4 text-center sm:text-left">
              <Toolbar
                onOpenSettings={() => setShowSettings(true)}
                {...toolbarAuthProps}
                leading={
                  <h1 className="text-[1.6875rem] font-bold tracking-wide genre-title m-0">
                    SpellPath
                  </h1>
                }
              />
              <p className="ui-subtitle">Choose your learning adventure</p>
            </div>

            <form onSubmit={handleSubjectSubmit} className="space-y-4">
              <div className="genre-card p-3.5 rounded-lg border">
                <label className="ui-label">
                  What would you like to learn?
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Printify, cloud computing, photosynthesis..."
                  className="w-full px-3.5 py-[0.6875rem] genre-input rounded-lg focus:outline-none"
                  disabled={isAnalyzing}
                />
              </div>

              <div className="genre-card p-3.5 rounded-lg border">
                <label className="ui-label">
                  What specifically do you want to learn?{' '}
                  <span className="ui-meta font-normal">(optional)</span>
                </label>
                <textarea
                  value={learningGoals}
                  onChange={(e) => setLearningGoals(e.target.value)}
                  placeholder="e.g., connect Printify to Etsy, understand pricing and mockups..."
                  rows={3}
                  className="w-full px-3.5 py-[0.6875rem] genre-input rounded-lg focus:outline-none resize-y min-h-[4.5rem]"
                  disabled={isAnalyzing}
                />
              </div>

              <div className="genre-card p-3.5 rounded-lg border">
                <label className="ui-label" htmlFor="learning-focus">
                  Main focus
                </label>
                <select
                  id="learning-focus"
                  value={learningFocus}
                  onChange={(e) => setLearningFocus(e.target.value)}
                  className="w-full px-3.5 py-[0.6875rem] genre-input rounded-lg focus:outline-none"
                  disabled={isAnalyzing}
                >
                  <option value="">Pick a focus (optional)</option>
                  {LEARNING_FOCUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="genre-card p-3.5 rounded-lg border">
                <label className="ui-label">
                  Choose your story style
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {STORY_GENRES.map(genre => (
                    <button
                      key={genre.id}
                      type="button"
                      onClick={() => handleGenreSelect(genre.id)}
                      className={`genre-picker__option${selectedGenre === genre.id ? ' genre-picker__option--selected' : ''}`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-[1.375rem] leading-none">{genre.icon}</span>
                        <div>
                          <div className="ui-genre-name">
                            {genre.name}
                          </div>
                          <div className="ui-genre-desc">
                            {genre.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="genre-card p-3.5 rounded-lg border">
                <label className="ui-label" htmlFor="author-style">
                  Author voice{' '}
                  <span className="ui-meta font-normal">(optional)</span>
                </label>
                <input
                  id="author-style"
                  type="text"
                  value={authorStyle}
                  onChange={(e) => setAuthorStyle(e.target.value)}
                  placeholder={
                    selectedGenre
                      ? `e.g. ${AUTHOR_EXAMPLES[selectedGenre]?.split(',')[0] || 'author name'}`
                      : 'Pick a story style first — e.g. Marion Zimmer Bradley'
                  }
                  className="w-full px-3.5 py-[0.6875rem] genre-input rounded-lg focus:outline-none"
                  disabled={isAnalyzing}
                />
                <p className="ui-meta mt-2">
                  Evokes prose rhythm and mood — not plot or quotes. We&apos;ll check it fits your story style.
                  {selectedGenre && (
                    <> Examples: {AUTHOR_EXAMPLES[selectedGenre]}.</>
                  )}
                </p>
              </div>

              <div className="genre-card p-3.5 rounded-lg border">
                <button
                  type="submit"
                  disabled={!subject.trim() || !selectedGenre || isAnalyzing}
                  className="w-full genre-button ui-btn px-5 py-[0.6875rem] rounded-lg"
                >
                  {isAnalyzing ? 'Checking topic...' : 'Begin Your Adventure'}
                </button>
              </div>

              {topicGateError && (
                <p className="ui-meta text-sm" style={{ color: 'var(--color-accent)' }}>
                  {topicGateError}
                </p>
              )}
            </form>
          </div>
        </main>
        {settingsModal}
      </>
    );
  }

  // =======================================================================
  // TOPIC VALIDATION
  // =======================================================================
  if (uiPhase === 'validating_topic') {
    return (
      <>
        <main className="scene">
          <SceneAtmosphere />
          <div className="scene__content ui-font">
            <div className="mb-6 text-center sm:text-left">
              <Toolbar onOpenSettings={() => setShowSettings(true)} {...toolbarAuthProps} />
            </div>
            <div className="genre-card p-8 rounded-lg text-center space-y-4">
              <h2 className="text-2xl font-bold genre-title">Checking your topic</h2>
              <p className="ui-subtitle">
                Making sure SpellPath can teach <span className="font-medium">{subject}</span>...
              </p>
            </div>
          </div>
        </main>
        {settingsModal}
      </>
    );
  }

  if (uiPhase === 'topic_reject') {
    return (
      <>
        <main className="scene">
          <SceneAtmosphere />
          <div className="scene__content scene__content--intake ui-font">
            <div className="mb-4 text-center sm:text-left">
              <Toolbar onOpenSettings={() => setShowSettings(true)} {...toolbarAuthProps} />
            </div>
            <div className="genre-card p-6 rounded-lg space-y-4">
              <h2 className="text-xl font-bold genre-title">Let's try a different topic</h2>
              <p className="ui-subtitle">{topicValidation?.reason || TOPIC_REJECT_MESSAGE}</p>
              <button
                type="button"
                onClick={() => {
                  setTopicValidation(null);
                  setUiPhase('input');
                }}
                className="w-full genre-button ui-btn px-4 py-3 rounded-lg"
              >
                Back to topic
              </button>
            </div>
          </div>
        </main>
        {settingsModal}
      </>
    );
  }

  if (uiPhase === 'topic_clarify') {
    return (
      <>
        <main className="scene">
          <SceneAtmosphere />
          <div className="scene__content scene__content--intake ui-font">
            <div className="mb-4 text-center sm:text-left">
              <Toolbar onOpenSettings={() => setShowSettings(true)} {...toolbarAuthProps} />
            </div>
            <form onSubmit={handleClarifyResubmit} className="genre-card p-6 rounded-lg space-y-4">
              <h2 className="text-xl font-bold genre-title">Help us narrow it down</h2>
              <p className="ui-subtitle">{topicValidation?.reason}</p>

              <div>
                <label className="ui-label">Topic</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-[0.6875rem] genre-input rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="ui-label">What specifically do you want to learn?</label>
                <textarea
                  value={learningGoals}
                  onChange={(e) => setLearningGoals(e.target.value)}
                  placeholder="e.g., Clan Munro in Scottish history, or how to research our family name..."
                  rows={3}
                  className="w-full px-3.5 py-[0.6875rem] genre-input rounded-lg focus:outline-none resize-y min-h-[4.5rem]"
                />
              </div>

              {topicValidation?.suggestions?.length > 0 && (
                <div className="space-y-2">
                  <p className="ui-meta">Suggestions:</p>
                  <div className="flex flex-wrap gap-2">
                    {topicValidation.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setLearningGoals(suggestion)}
                        className="genre-button ui-btn px-3 py-1.5 rounded-lg text-sm"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!subject.trim()}
                className="w-full genre-button ui-btn px-4 py-3 rounded-lg"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => {
                  setTopicValidation(null);
                  setUiPhase('input');
                }}
                className="ui-link"
              >
                ← Back
              </button>
            </form>
          </div>
        </main>
        {settingsModal}
      </>
    );
  }

  if (uiPhase === 'topic_author_warn') {
    const suggestedGenre = STORY_GENRES.find(g => g.id === authorStyleWarning?.suggestedGenre);

    return (
      <>
        <main className="scene">
          <SceneAtmosphere />
          <div className="scene__content scene__content--intake ui-font">
            <div className="mb-4 text-center sm:text-left">
              <Toolbar onOpenSettings={() => setShowSettings(true)} {...toolbarAuthProps} />
            </div>
            <div className="genre-card p-6 rounded-lg space-y-4">
              <h2 className="text-xl font-bold genre-title">Author voice check</h2>
              <p className="ui-subtitle">{authorStyleWarning?.reason}</p>
              <p className="ui-meta">
                You chose <span className="font-medium">{STORY_GENRES.find(g => g.id === selectedGenre)?.name}</span>
                {' '}with author <span className="font-medium">{authorStyle.trim()}</span>.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => pendingTopicResult && acceptTopicValidation(pendingTopicResult)}
                  className="w-full genre-button ui-btn px-4 py-3 rounded-lg"
                >
                  Continue anyway
                </button>
                {suggestedGenre && (
                  <button
                    type="button"
                    onClick={() => {
                      handleGenreSelect(suggestedGenre.id);
                      if (pendingTopicResult) acceptTopicValidation(pendingTopicResult);
                    }}
                    className="w-full genre-button ui-btn px-4 py-3 rounded-lg opacity-90"
                  >
                    Switch to {suggestedGenre.name} and continue
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAuthorStyle('');
                    setAuthorStyleWarning(null);
                    setPendingTopicResult(null);
                    setUiPhase('input');
                  }}
                  className="ui-link"
                >
                  ← Edit author or topic
                </button>
              </div>
            </div>
          </div>
        </main>
        {settingsModal}
      </>
    );
  }

  // =======================================================================
  // QUIZ LOADING (fetching AI-generated questions)
  // =======================================================================
  if (uiPhase === 'quiz_loading') {
    return (
      <>
        <main className="scene">
          <SceneAtmosphere />
          <div className="scene__content ui-font">
            <div className="mb-6 text-center sm:text-left">
              <Toolbar onOpenSettings={() => setShowSettings(true)} {...toolbarAuthProps} />
            </div>
            <div className="genre-card p-8 rounded-lg text-center space-y-4">
              <h2 className="text-2xl font-bold genre-title">Tailoring Your Quiz</h2>
              <p className="ui-subtitle">
                Creating questions specific to <span className="font-medium">{subject}</span>...
              </p>
            </div>
          </div>
        </main>
        {settingsModal}
      </>
    );
  }

  // =======================================================================
  // QUIZ PHASE (intake)
  // =======================================================================
  if (uiPhase === 'quiz' && quizData) {
    const question = quizData.questions[currentQuestion];
    const currentGenre = STORY_GENRES.find(g => g.id === quizData.genre);

    return (
      <>
        <main className="scene">
          <SceneAtmosphere />
          <div className="scene__content ui-font scene__content--quiz">
            <div className="mb-6 text-center sm:text-left">
              <Toolbar onOpenSettings={() => setShowSettings(true)} {...toolbarAuthProps} />
              <button
                type="button"
                onClick={() => setUiPhase('input')}
                className="ui-link"
              >
                <span>←</span>
                <span>Choose different topic</span>
              </button>
              <div className="genre-card p-3 rounded-lg">
                <p className="ui-meta">
                  Learning: <span className="font-medium">{quizData.subject}</span> |{' '}
                  Style: <span className="font-medium">{currentGenre?.name}</span>
                </p>
                {learningGoals.trim() && (
                  <p className="ui-meta mt-1">
                    Goal: <span className="font-medium">{learningGoals.trim()}</span>
                  </p>
                )}
                {authorStyle.trim() && (
                  <p className="ui-meta mt-1">
                    Voice: <span className="font-medium">{authorStyle.trim()}</span>
                  </p>
                )}
                {topicAcceptNote && (
                  <p className="story-adaptation-notice story-adaptation-notice--path mt-3 mb-0" role="status">
                    {topicAcceptNote}
                  </p>
                )}
              </div>
            </div>

            <div className="genre-card p-6 rounded-lg mb-6">
              <p className="ui-meta mb-3">
                Question {currentQuestion + 1} of {quizData.questions.length}
              </p>
              <IntakeQuestion
                key={question.id}
                question={question}
                onAnswer={handleQuizAnswer}
              />
            </div>
          </div>
        </main>
        {settingsModal}
      </>
    );
  }

  // =======================================================================
  // SCAFFOLDING PHASE (loading)
  // =======================================================================
  if (uiPhase === 'scaffolding') {
    return (
      <>
        <main className="scene">
          <SceneAtmosphere />
          <div className="scene__content ui-font">
            <div className="mb-6 text-center sm:text-left">
              <Toolbar onOpenSettings={() => setShowSettings(true)} {...toolbarAuthProps} />
            </div>
            <div className="genre-card p-8 rounded-lg text-center space-y-4">
              {error && !isLoading ? (
                <>
                  <h2 className="text-2xl font-bold genre-title">Couldn&apos;t Build Your Path</h2>
                  <p className="ui-subtitle text-left" style={{ color: 'var(--color-accent)' }}>
                    {error}
                  </p>
                  <p className="text-sm opacity-80 text-left">
                    Check that <code className="text-xs">npm run api</code> is running, your active
                    provider key in Settings is valid, and try again.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => finishQuiz(userAnswers)}
                      className="flex-1 genre-button ui-btn px-4 py-3 rounded-lg"
                    >
                      Try again
                    </button>
                    <button
                      type="button"
                      onClick={() => setUiPhase('input')}
                      className="flex-1 genre-button ui-btn px-4 py-3 rounded-lg opacity-90"
                    >
                      Back to start
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold genre-title">Building Your Path</h2>
                  <p className="ui-subtitle">
                    Crafting a personalized learning journey for{' '}
                    <span className="font-medium">{subject}</span>...
                  </p>
                </>
              )}
            </div>
          </div>
        </main>
        {settingsModal}
      </>
    );
  }

  // =======================================================================
  // COMPLETE PHASE (checked before story so engine-driven completion works)
  // =======================================================================
  if (uiPhase === 'complete' || enginePhase === STORY_PHASES.COMPLETE) {
    return (
      <>
        <main className="scene">
          <SceneAtmosphere />
          <div className="scene__content ui-font">
            <div className="mb-6 text-center sm:text-left">
              <Toolbar onOpenSettings={() => setShowSettings(true)} {...toolbarAuthProps} />
            </div>

            <div className="genre-card p-6 rounded-lg text-center space-y-4">
              <h2 className="text-2xl font-bold genre-title">Journey Complete!</h2>
              <p className="ui-subtitle">
                You explored <span className="font-medium">{subject}</span> across {storySoFar.length} beats.
              </p>

              {storySoFar.length > 0 && (
                <div className="text-left space-y-2">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>Recap</p>
                  <ul className="space-y-1 text-sm opacity-80">
                    {storySoFar.map((beat, i) => (
                      <li key={i}>
                        <span className="font-medium">{beat.beatTitle}:</span> {beat.summary}{' '}
                        {beat.correct ? '✓' : '✗'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {storySoFar.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => downloadStoryJson(buildArchive())}
                    className="flex-1 genre-button ui-btn px-4 py-3 rounded-lg"
                  >
                    Download JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => openStoryPdf(buildArchive())}
                    className="flex-1 genre-button ui-btn px-4 py-3 rounded-lg"
                  >
                    Download PDF
                  </button>
                </div>
              )}

              <button
                onClick={handleStartOver}
                className="w-full genre-button ui-btn px-4 py-3 rounded-lg"
              >
                Start New Adventure
              </button>
            </div>
          </div>
        </main>
        {settingsModal}
      </>
    );
  }

  // =======================================================================
  // STORY PHASE (beat by beat)
  // =======================================================================
  if (uiPhase === 'story') {
    return (
      <>
        <main className="scene">
          <SceneAtmosphere />
          <div className="scene__content scene__content--story">
            <div className="mb-6 text-center sm:text-left story-chrome">
              <Toolbar onOpenSettings={() => setShowSettings(true)} {...toolbarAuthProps} />
              <h2 className="text-2xl font-bold genre-title mb-2">Your Story</h2>
              <div className="flex items-center gap-3 mb-1">
                <p className="ui-meta">
                  Beat {beatIndex + 1} of {totalBeats}
                </p>
                {scaffold?.beats?.[beatIndex]?.isRemedial && (
                  <span className="story-remedial-badge">Practice beat</span>
                )}
              </div>
              {progressBar}
            </div>

            {error && (
              <div className="genre-card p-4 rounded-lg mb-4 space-y-3">
                <p className="text-sm" style={{ color: 'var(--color-accent)' }}>{error}</p>
              </div>
            )}

            {adaptationNotice?.type === 'path' && (
              <p className="story-adaptation-notice story-adaptation-notice--path mb-4" role="status">
                {adaptationNotice.message}
              </p>
            )}

            <StoryBeat
              key={beatIndex}
              narrative={currentBeatData?.narrative}
              checkpoint={currentBeatData?.checkpoint}
              onAnswer={handleCheckpointAnswer}
              isLoading={isLoading}
              loadingMessage={loadingMessage}
              adaptationNotice={adaptationNotice?.type !== 'path' ? adaptationNotice : null}
            />

            {checkpointAnswered && (
              <div className="mt-4 story-chrome">
                <button
                  onClick={handleContinue}
                  disabled={isLoading}
                  className="w-full genre-button ui-btn px-4 py-3 rounded-lg"
                >
                  {isLoading ? 'Loading next beat...' : (beatIndex + 1 >= totalBeats ? 'Finish Journey' : 'Continue')}
                </button>
              </div>
            )}

            {storySoFar.length > 0 && (
              <details className="mt-6 genre-card p-4 rounded-lg story-chrome">
                <summary className="ui-meta font-medium cursor-pointer">
                  Story so far ({storySoFar.length} beat{storySoFar.length !== 1 ? 's' : ''})
                </summary>
                <ul className="mt-2 space-y-1 ui-meta">
                  {storySoFar.map((beat, i) => (
                    <li key={i}>
                      <span className="font-medium">{beat.beatTitle}:</span> {beat.summary}{' '}
                      {beat.correct ? '✓' : '✗'}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </main>
        {settingsModal}
      </>
    );
  }

  return null;
}

export default App;
