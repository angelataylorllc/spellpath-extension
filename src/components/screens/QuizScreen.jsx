import { STORY_GENRES } from '../../config/genres';
import SceneShell from '../SceneShell';
import Toolbar from '../Toolbar';
import IntakeQuestion from '../IntakeQuestion';

export function QuizLoadingScreen({ subject, onOpenSettings, toolbarAuthProps, settings }) {
  return (
    <SceneShell settings={settings}>
      <div className="mb-6 text-center sm:text-left">
        <Toolbar onOpenSettings={onOpenSettings} {...toolbarAuthProps} />
      </div>
      <div className="genre-card story-loading p-8 rounded-lg text-center space-y-4">
        <h2 className="text-2xl font-bold genre-title">Tailoring Your Quiz</h2>
        <p className="ui-subtitle">
          Creating questions specific to <span className="font-medium">{subject}</span>...
        </p>
        <div className="story-loading__pulse" aria-hidden="true" />
      </div>
    </SceneShell>
  );
}

export function QuizScreen({
  quizData,
  currentQuestion,
  learningGoals,
  authorStyle,
  topicAcceptNote,
  onAnswer,
  onBack,
  onOpenSettings,
  toolbarAuthProps,
  settings,
}) {
  const question = quizData.questions[currentQuestion];
  const currentGenre = STORY_GENRES.find(g => g.id === quizData.genre);

  return (
    <SceneShell contentClassName="scene__content ui-font scene__content--quiz" settings={settings}>
      <div className="mb-6 text-center sm:text-left">
        <Toolbar onOpenSettings={onOpenSettings} {...toolbarAuthProps} />
        <button
          type="button"
          onClick={onBack}
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
          onAnswer={onAnswer}
        />
      </div>
    </SceneShell>
  );
}
