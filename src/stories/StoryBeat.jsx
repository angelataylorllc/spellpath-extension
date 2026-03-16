import { useState } from 'react';

const StoryBeat = ({ narrative, checkpoint, onAnswer, isLoading }) => {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  if (isLoading) {
    return (
      <div className="genre-card p-6 rounded-lg text-center space-y-3">
        <p className="text-base opacity-80">Crafting the next part of your story...</p>
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
    <div className="space-y-4">
      <div className="genre-card p-6 rounded-lg space-y-3">
        {narrative.split('\n\n').map((para, i) => (
          <p key={i} className="text-sm leading-relaxed">{para}</p>
        ))}
      </div>

      {checkpoint && (
        <div className="genre-card p-6 rounded-lg space-y-4">
          <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
            Checkpoint
          </p>
          <p className="text-sm">{checkpoint.question}</p>

          <div className="flex flex-col gap-2">
            {checkpoint.options.map((opt, i) => {
              let borderColor = 'var(--color-accent-soft)';
              let bg = 'var(--color-bg-alt)';

              if (submitted) {
                if (i === correctIndex) {
                  borderColor = '#22c55e';
                  bg = 'rgba(34,197,94,0.12)';
                } else if (i === selected && !opt.correct) {
                  borderColor = '#ef4444';
                  bg = 'rgba(239,68,68,0.12)';
                }
              } else if (i === selected) {
                borderColor = 'var(--color-accent)';
                bg = 'var(--color-accent-soft)';
              }

              return (
                <button
                  key={i}
                  onClick={() => !submitted && setSelected(i)}
                  disabled={submitted}
                  className="w-full p-3 rounded-lg text-sm text-left transition-all"
                  style={{
                    border: `2px solid ${borderColor}`,
                    backgroundColor: bg,
                    color: 'var(--color-text)',
                    cursor: submitted ? 'default' : 'pointer',
                    opacity: submitted && i !== selected && i !== correctIndex ? 0.5 : 1,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {!submitted && (
            <button
              onClick={handleSubmit}
              disabled={selected === null}
              className="w-full genre-button px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--btn-fg, var(--color-bg))',
                opacity: selected === null ? 0.5 : 1,
                cursor: selected === null ? 'not-allowed' : 'pointer',
              }}
            >
              Submit Answer
            </button>
          )}

          {submitted && checkpoint.hint && !checkpoint.options[selected]?.correct && (
            <p className="text-sm opacity-80 italic">{checkpoint.hint}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default StoryBeat;
