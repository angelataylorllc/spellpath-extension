import { useState, useMemo } from 'react';
import { useNarrativeReveal } from '../hooks/useNarrativeReveal';
import { parseNarrativeBlocks } from './parseNarrativeBlocks';

const StoryBeat = ({ narrative, checkpoint, onAnswer, isLoading }) => {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const paragraphs = useMemo(
    () => (narrative ? narrative.split(/\n\n+/).map(p => p.trim()).filter(Boolean) : []),
    [narrative],
  );

  const { visibleParagraphs, complete: narrativeComplete, skip, isTyping } = useNarrativeReveal(
    paragraphs,
    narrative,
  );

  if (isLoading) {
    return (
      <div className="genre-card story-loading p-8 rounded-xl text-center space-y-3">
        <p className="story-loading__text">Crafting the next part of your story...</p>
        <div className="story-loading__pulse" aria-hidden="true" />
      </div>
    );
  }

  if (!narrative) return null;

  const handleSubmit = () => {
    if (selected === null) return;
    setSubmitted(true);
    const correct = checkpoint.options[selected]?.correct ?? false;
    onAnswer({ selectedIndex: selected, correct });
  };

  const correctIndex = checkpoint?.options?.findIndex(o => o.correct);

  return (
    <div className="story-beat space-y-6">
      <article className="story-narrative genre-card rounded-xl px-7 py-8 sm:px-10 sm:py-10 space-y-7">
        <div className="story-narrative__toolbar">
          {isTyping && (
            <button
              type="button"
              onClick={skip}
              className="story-skip-btn"
              aria-label="Show full story text"
            >
              Skip →
            </button>
          )}
        </div>

        {visibleParagraphs.map((para, paraIndex) => {
          if (!para) return null;

          const blocks = parseNarrativeBlocks(para);
          const isLastParagraph = paraIndex === visibleParagraphs.length - 1;

          return (
            <div key={paraIndex} className="story-paragraph-group">
              {blocks.map((block, blockIndex) => {
                const isLastBlock = isLastParagraph && blockIndex === blocks.length - 1;
                const className =
                  block.type === 'dialogue' ? 'story-dialogue-line' : 'story-paragraph';

                return (
                  <p key={blockIndex} className={className}>
                    {block.text}
                    {isTyping && isLastBlock && (
                      <span className="story-cursor" aria-hidden="true" />
                    )}
                  </p>
                );
              })}
            </div>
          );
        })}
      </article>

      {checkpoint && narrativeComplete && (
        <div className="story-checkpoint rounded-xl px-5 py-5 sm:px-6 space-y-4">
          <p className="story-checkpoint__label">A choice awaits</p>
          <p className="story-checkpoint__question">{checkpoint.question}</p>

          <div className="story-checkpoint__options">
            {checkpoint.options.map((opt, i) => {
              let stateClass = '';
              if (submitted) {
                if (i === correctIndex) stateClass = 'story-choice--correct';
                else if (i === selected && !opt.correct) stateClass = 'story-choice--wrong';
                else stateClass = 'story-choice--dim';
              } else if (i === selected) {
                stateClass = 'story-choice--selected';
              }

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => !submitted && setSelected(i)}
                  disabled={submitted}
                  className={`story-choice ${stateClass}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {!submitted && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selected === null}
              className="genre-button ui-btn story-checkpoint__submit w-full px-4 py-2.5 rounded-lg"
            >
              Lock in your choice
            </button>
          )}

          {submitted && checkpoint.hint && !checkpoint.options[selected]?.correct && (
            <p className="story-checkpoint__hint">{checkpoint.hint}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default StoryBeat;
