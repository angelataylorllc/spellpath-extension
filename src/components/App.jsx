import { useState, useEffect } from 'react';
import '../index.css';
import '../styles/theme-tokens.css';
import '../styles/theme-components.css';
import '../styles/theme-atmosphere.css';
import '../styles/story-ui.css';
import '../styles/adventure-campfire.css';
import '../styles/adventure-wind.css';
import { STORY_GENRES } from '../config/genres';
import { IS_BYOK } from '../config/edition';
import { cardsForGenre, findAuthorCardById, authorListedForGenre } from '../config/authorVoice';
import { useTheme } from '../contexts/ThemeContext';
import { Settings } from './Settings';
import { LoginGate } from './LoginGate';
import AuthLoadingScreen from './AuthLoadingScreen';
import { useAuth } from '../contexts/AuthContext';
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
import { normalizeMotivation } from '../../lib/motivation.js';
import { learningGoalsAreSpecific, resolveLearningFocus } from '../../lib/learningFocus.js';
import { AGE_QUIZ_CHOICES, normalizeAge } from '../../lib/ageBand.js';
import HomeScreen from './screens/HomeScreen';
import {
  TopicValidatingScreen,
  TopicRejectScreen,
  TopicClarifyScreen,
  TopicAuthorWarnScreen,
} from './screens/TopicGateScreens';
import { QuizLoadingScreen, QuizScreen } from './screens/QuizScreen';
import ScaffoldingScreen from './screens/ScaffoldingScreen';
import StoryScreen from './screens/StoryScreen';
import CompleteScreen from './screens/CompleteScreen';

function App() {
  const { mode, setTheme } = useTheme();
  const { authEnabled, user, loading: authLoading, error: authError, signIn, signOut } = useAuth();
  const [subject, setSubject] = useState('');
  const [learningGoals, setLearningGoals] = useState('');
  const [learningFocus, setLearningFocus] = useState('');
  const [showFocusFallback, setShowFocusFallback] = useState(false);
  const [authorPresetId, setAuthorPresetId] = useState('');
  const [authorStyleOther, setAuthorStyleOther] = useState('');
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
    quotaBlock,
    adaptationNotice,
    initScaffold,
    submitCheckpoint,
    continueStory,
    reset: resetEngine,
  } = useStory();

  const authorCards = selectedGenre ? cardsForGenre(selectedGenre) : [];
  const selectedAuthorCard = authorCards.find(c => c.id === authorPresetId) || null;
  const authorStyle = (authorStyleOther.trim() || selectedAuthorCard?.name || '').trim();

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
    authorStyle,
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
    if (authorPresetId && !cardsForGenre(genreId).some(c => c.id === authorPresetId)) {
      const prevCard = findAuthorCardById(authorPresetId);
      if (prevCard && !authorStyleOther.trim()) {
        setAuthorStyleOther(prevCard.name);
      }
      setAuthorPresetId('');
    }
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
    const listedForThisGenre = authorListedForGenre(authorStyle, selectedGenre);
    if (
      !listedForThisGenre
      && authorStyle.trim()
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

    if (!learningGoalsAreSpecific(learningGoals) && !showFocusFallback) {
      setShowFocusFallback(true);
      return;
    }

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
        learningFocus: resolveLearningFocus(learningGoals, learningFocus),
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
        choices: AGE_QUIZ_CHOICES,
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
        text: `Why are you learning ${subj}?`,
        type: 'choice',
        choices: [
          { label: 'Just curious / exploring', value: 'curious' },
          { label: 'School / coursework', value: 'school' },
          { label: 'Building or using it for something', value: 'building' },
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

      const age = normalizeAge(newAnswers.find(a => a.questionId === 'u_1')?.answer);
      const level = newAnswers.find(a => a.questionId === 'u_2')?.answer || 'beginner';
      const motivation = normalizeMotivation(newAnswers.find(a => a.questionId === 'u_3')?.answer);

      try {
        const result = await generateIntakeQuestions({
          subject,
          genre: selectedGenre,
          age,
          level,
          motivation,
          learningGoals: learningGoals.trim(),
          learningFocus: resolveLearningFocus(learningGoals, learningFocus),
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
    const age = normalizeAge(answers.find(a => a.questionId === 'u_1')?.answer);
    const level = answers.find(a => a.questionId === 'u_2')?.answer || 'beginner';
    const motivation = normalizeMotivation(answers.find(a => a.questionId === 'u_3')?.answer);
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
      learningFocus: resolveLearningFocus(learningGoals, learningFocus),
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

  const handleSteer = async (direction) => {
    setCheckpointAnswered(false);
    await continueStory(direction);
  };

  const handleStartOver = () => {
    resetEngine();
    setSessionLogged(false);
    setSubject('');
    setLearningGoals('');
    setLearningFocus('');
    setShowFocusFallback(false);
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
    setAuthorPresetId('');
    setAuthorStyleOther('');
    setUiPhase('input');
  };

  // --- Render ---

  if (authEnabled && authLoading) {
    return <AuthLoadingScreen />;
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
  const settings = IS_BYOK && showSettings && <Settings onClose={() => setShowSettings(false)} />;
  const chrome = {
    onOpenSettings: IS_BYOK ? () => setShowSettings(true) : undefined,
    toolbarAuthProps,
    settings,
  };

  if (uiPhase === 'input') {
    return (
      <HomeScreen
        subject={subject}
        onSubjectChange={setSubject}
        learningGoals={learningGoals}
        onLearningGoalsChange={setLearningGoals}
        learningFocus={learningFocus}
        onLearningFocusChange={setLearningFocus}
        showFocusFallback={showFocusFallback}
        onShowFocusFallback={() => setShowFocusFallback(true)}
        selectedGenre={selectedGenre}
        onGenreSelect={handleGenreSelect}
        authorPresetId={authorPresetId}
        onAuthorPresetChange={(id) => {
          setAuthorPresetId(id);
          if (id) setAuthorStyleOther('');
        }}
        authorStyleOther={authorStyleOther}
        onAuthorStyleOtherChange={setAuthorStyleOther}
        authorCards={authorCards}
        isAnalyzing={isAnalyzing}
        topicGateError={topicGateError}
        onSubmit={handleSubjectSubmit}
        {...chrome}
      />
    );
  }

  if (uiPhase === 'validating_topic') {
    return <TopicValidatingScreen subject={subject} {...chrome} />;
  }

  if (uiPhase === 'topic_reject') {
    return (
      <TopicRejectScreen
        reason={topicValidation?.reason}
        onBack={() => {
          setTopicValidation(null);
          setUiPhase('input');
        }}
        {...chrome}
      />
    );
  }

  if (uiPhase === 'topic_clarify') {
    return (
      <TopicClarifyScreen
        reason={topicValidation?.reason}
        suggestions={topicValidation?.suggestions}
        subject={subject}
        onSubjectChange={setSubject}
        learningGoals={learningGoals}
        onLearningGoalsChange={setLearningGoals}
        onSubmit={handleClarifyResubmit}
        onBack={() => {
          setTopicValidation(null);
          setUiPhase('input');
        }}
        {...chrome}
      />
    );
  }

  if (uiPhase === 'topic_author_warn') {
    return (
      <TopicAuthorWarnScreen
        warning={authorStyleWarning}
        selectedGenre={selectedGenre}
        authorStyle={authorStyle}
        onContinueAnyway={() => pendingTopicResult && acceptTopicValidation(pendingTopicResult)}
        onSwitchGenreAndContinue={(genreId) => {
          handleGenreSelect(genreId);
          if (pendingTopicResult) acceptTopicValidation(pendingTopicResult);
        }}
        onEdit={() => {
          setAuthorPresetId('');
          setAuthorStyleOther('');
          setAuthorStyleWarning(null);
          setPendingTopicResult(null);
          setUiPhase('input');
        }}
        {...chrome}
      />
    );
  }

  if (uiPhase === 'quiz_loading') {
    return <QuizLoadingScreen subject={subject} {...chrome} />;
  }

  if (uiPhase === 'quiz' && quizData) {
    return (
      <QuizScreen
        quizData={quizData}
        currentQuestion={currentQuestion}
        learningGoals={learningGoals}
        authorStyle={authorStyle}
        topicAcceptNote={topicAcceptNote}
        onAnswer={handleQuizAnswer}
        onBack={() => setUiPhase('input')}
        {...chrome}
      />
    );
  }

  if (uiPhase === 'scaffolding') {
    return (
      <ScaffoldingScreen
        subject={subject}
        error={error}
        quotaBlock={quotaBlock}
        isLoading={isLoading}
        onRetry={() => finishQuiz(userAnswers)}
        onBack={() => setUiPhase('input')}
        {...chrome}
      />
    );
  }

  if (uiPhase === 'complete' || enginePhase === STORY_PHASES.COMPLETE) {
    return (
      <CompleteScreen
        subject={subject}
        storySoFar={storySoFar}
        onDownloadJson={() => downloadStoryJson(buildArchive())}
        onDownloadPdf={() => openStoryPdf(buildArchive())}
        onStartOver={handleStartOver}
        {...chrome}
      />
    );
  }

  if (uiPhase === 'story') {
    return (
      <StoryScreen
        scaffold={scaffold}
        currentBeatData={currentBeatData}
        beatIndex={beatIndex}
        totalBeats={totalBeats}
        storySoFar={storySoFar}
        learnerProfile={learnerProfile}
        isLoading={isLoading}
        loadingMessage={loadingMessage}
        error={error}
        adaptationNotice={adaptationNotice}
        checkpointAnswered={checkpointAnswered}
        onAnswer={handleCheckpointAnswer}
        onContinue={handleContinue}
        onSteer={handleSteer}
        {...chrome}
      />
    );
  }

  return null;
}

export default App;
