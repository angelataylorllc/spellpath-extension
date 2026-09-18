import { STORY_GENRES } from '../../config/genres';
import { LEARNING_FOCUS_OPTIONS } from '../../config/learningFocus';
import { learningGoalsAreSpecific } from '../../../lib/learningFocus.js';
import SceneShell from '../SceneShell';
import Toolbar from '../Toolbar';

export default function HomeScreen({
  subject,
  onSubjectChange,
  learningGoals,
  onLearningGoalsChange,
  learningFocus,
  onLearningFocusChange,
  showFocusFallback,
  onShowFocusFallback,
  selectedGenre,
  onGenreSelect,
  authorPresetId,
  onAuthorPresetChange,
  authorStyleOther,
  onAuthorStyleOtherChange,
  authorCards,
  isAnalyzing,
  topicGateError,
  onSubmit,
  onOpenSettings,
  toolbarAuthProps,
  settings,
}) {
  return (
    <SceneShell contentClassName="scene__content scene__content--intake ui-font" settings={settings}>
      <div className="mb-4 text-center sm:text-left">
        <Toolbar
          onOpenSettings={onOpenSettings}
          {...toolbarAuthProps}
          leading={
            <h1 className="text-[1.6875rem] font-bold tracking-wide genre-title m-0">
              SpellPath
            </h1>
          }
        />
        <p className="ui-subtitle">Choose your learning adventure</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="genre-card p-3.5 rounded-lg border">
          <label className="ui-label">
            What would you like to learn?
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
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
            onChange={(e) => onLearningGoalsChange(e.target.value)}
            placeholder="e.g., connect Printify to Etsy, understand pricing and mockups..."
            rows={3}
            className="w-full px-3.5 py-[0.6875rem] genre-input rounded-lg focus:outline-none resize-y min-h-[4.5rem]"
            disabled={isAnalyzing}
          />
          {!showFocusFallback && !learningGoalsAreSpecific(learningGoals) && (
            <button
              type="button"
              onClick={onShowFocusFallback}
              className="ui-link mt-2"
            >
              Not sure yet?{' '}
              <span
                className="font-bold"
                style={{ color: 'var(--color-accent)' }}
              >
                Pick a focus
              </span>
            </button>
          )}
        </div>

        {showFocusFallback && !learningGoalsAreSpecific(learningGoals) && (
          <div className="genre-card p-3.5 rounded-lg border">
            <label className="ui-label" htmlFor="learning-focus">
              Main focus{' '}
              <span className="ui-meta font-normal">(optional)</span>
            </label>
            <select
              id="learning-focus"
              value={learningFocus}
              onChange={(e) => onLearningFocusChange(e.target.value)}
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
        )}

        <div className="genre-card p-3.5 rounded-lg border">
          <label className="ui-label">
            Choose your story style
          </label>
          <div className="grid grid-cols-1 gap-2.5">
            {STORY_GENRES.map(genre => (
              <button
                key={genre.id}
                type="button"
                onClick={() => onGenreSelect(genre.id)}
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
          <label className="ui-label" htmlFor="author-preset">
            Author voice{' '}
            <span className="ui-meta font-normal">(optional)</span>
          </label>
          <select
            id="author-preset"
            value={authorPresetId}
            onChange={(e) => onAuthorPresetChange(e.target.value)}
            className="w-full px-3.5 py-[0.6875rem] genre-input genre-select rounded-lg focus:outline-none"
            disabled={isAnalyzing || !selectedGenre}
          >
            <option value="">
              {selectedGenre ? 'Optional — pick a voice' : 'Pick a story style first'}
            </option>
            {authorCards.map(card => (
              <option key={card.id} value={card.id}>
                {card.name}
              </option>
            ))}
          </select>
          {selectedGenre && authorCards.length > 0 && (
            <ul className="ui-meta mt-2 pl-4 list-disc space-y-1">
              {authorCards.map(card => (
                <li key={card.id}>
                  <span className="font-medium">{card.name}</span>
                  {' — '}
                  {card.note}
                </li>
              ))}
            </ul>
          )}
          <label className="ui-label mt-4" htmlFor="author-style-other">
            Someone else
          </label>
          <input
            id="author-style-other"
            type="text"
            value={authorStyleOther}
            onChange={(e) => onAuthorStyleOtherChange(e.target.value)}
            placeholder={
              selectedGenre
                ? 'Or type another author'
                : 'Pick a story style first, or type an author'
            }
            className="w-full px-3.5 py-[0.6875rem] genre-input rounded-lg focus:outline-none"
            disabled={isAnalyzing}
          />
          {authorStyleOther.trim() && authorPresetId && (
            <p className="ui-meta mt-2">Using the typed name — it overrides the list.</p>
          )}
          <p className="ui-meta mt-2">
            Evokes prose rhythm and mood — not plot or quotes. We&apos;ll check it fits your story style.
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
    </SceneShell>
  );
}
