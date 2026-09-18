import { STORY_GENRES } from '../../config/genres';
import { TOPIC_REJECT_MESSAGE } from '../../lib/validateTopicClient';
import SceneShell from '../SceneShell';
import Toolbar from '../Toolbar';

function GateHeader({ onOpenSettings, toolbarAuthProps }) {
  return (
    <div className="mb-4 text-center sm:text-left">
      <Toolbar onOpenSettings={onOpenSettings} {...toolbarAuthProps} />
    </div>
  );
}

export function TopicValidatingScreen({ subject, onOpenSettings, toolbarAuthProps, settings }) {
  return (
    <SceneShell settings={settings}>
      <div className="mb-6 text-center sm:text-left">
        <Toolbar onOpenSettings={onOpenSettings} {...toolbarAuthProps} />
      </div>
      <div className="genre-card p-8 rounded-lg text-center space-y-4">
        <h2 className="text-2xl font-bold genre-title">Checking your topic</h2>
        <p className="ui-subtitle">
          Making sure SpellPath can teach <span className="font-medium">{subject}</span>...
        </p>
      </div>
    </SceneShell>
  );
}

export function TopicRejectScreen({
  reason,
  onBack,
  onOpenSettings,
  toolbarAuthProps,
  settings,
}) {
  return (
    <SceneShell contentClassName="scene__content scene__content--intake ui-font" settings={settings}>
      <GateHeader onOpenSettings={onOpenSettings} toolbarAuthProps={toolbarAuthProps} />
      <div className="genre-card p-6 rounded-lg space-y-4">
        <h2 className="text-xl font-bold genre-title">Let's try a different topic</h2>
        <p className="ui-subtitle">{reason || TOPIC_REJECT_MESSAGE}</p>
        <button
          type="button"
          onClick={onBack}
          className="w-full genre-button ui-btn px-4 py-3 rounded-lg"
        >
          Back to topic
        </button>
      </div>
    </SceneShell>
  );
}

export function TopicClarifyScreen({
  reason,
  suggestions,
  subject,
  onSubjectChange,
  learningGoals,
  onLearningGoalsChange,
  onSubmit,
  onBack,
  onOpenSettings,
  toolbarAuthProps,
  settings,
}) {
  return (
    <SceneShell contentClassName="scene__content scene__content--intake ui-font" settings={settings}>
      <GateHeader onOpenSettings={onOpenSettings} toolbarAuthProps={toolbarAuthProps} />
      <form onSubmit={onSubmit} className="genre-card p-6 rounded-lg space-y-4">
        <h2 className="text-xl font-bold genre-title">Help us narrow it down</h2>
        <p className="ui-subtitle">{reason}</p>

        <div>
          <label className="ui-label">Topic</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            className="w-full px-3.5 py-[0.6875rem] genre-input rounded-lg focus:outline-none"
          />
        </div>

        <div>
          <label className="ui-label">What specifically do you want to learn?</label>
          <textarea
            value={learningGoals}
            onChange={(e) => onLearningGoalsChange(e.target.value)}
            placeholder="e.g., Clan Munro in Scottish history, or how to research our family name..."
            rows={3}
            className="w-full px-3.5 py-[0.6875rem] genre-input rounded-lg focus:outline-none resize-y min-h-[4.5rem]"
          />
        </div>

        {suggestions?.length > 0 && (
          <div className="space-y-2">
            <p className="ui-meta">Suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onLearningGoalsChange(suggestion)}
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
          onClick={onBack}
          className="ui-link"
        >
          ← Back
        </button>
      </form>
    </SceneShell>
  );
}

export function TopicAuthorWarnScreen({
  warning,
  selectedGenre,
  authorStyle,
  onContinueAnyway,
  onSwitchGenreAndContinue,
  onEdit,
  onOpenSettings,
  toolbarAuthProps,
  settings,
}) {
  const suggestedGenre = STORY_GENRES.find(g => g.id === warning?.suggestedGenre);

  return (
    <SceneShell contentClassName="scene__content scene__content--intake ui-font" settings={settings}>
      <GateHeader onOpenSettings={onOpenSettings} toolbarAuthProps={toolbarAuthProps} />
      <div className="genre-card p-6 rounded-lg space-y-4">
        <h2 className="text-xl font-bold genre-title">Author voice check</h2>
        <p className="ui-subtitle">{warning?.reason}</p>
        <p className="ui-meta">
          You chose <span className="font-medium">{STORY_GENRES.find(g => g.id === selectedGenre)?.name}</span>
          {' '}with author <span className="font-medium">{authorStyle.trim()}</span>.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onContinueAnyway}
            className="w-full genre-button ui-btn px-4 py-3 rounded-lg"
          >
            Continue anyway
          </button>
          {suggestedGenre && (
            <button
              type="button"
              onClick={() => onSwitchGenreAndContinue(suggestedGenre.id)}
              className="w-full genre-button ui-btn px-4 py-3 rounded-lg opacity-90"
            >
              Switch to {suggestedGenre.name} and continue
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="ui-link"
          >
            ← Edit author or topic
          </button>
        </div>
      </div>
    </SceneShell>
  );
}
