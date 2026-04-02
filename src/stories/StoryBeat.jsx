import { useState } from 'react';

const StoryBeat = ({ narrative, checkpoint, onAnswer, isLoading }) => {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  if (isLoading) {
    return (
      <div className="genre-card p-8 rounded-xl text-center space-y-3">
        <p className="text-base opacity-80" style={{ fontFamily: 'var(--font-body, ui-sans-serif)' }}>
          Crafting the next part of your story...
        </p>
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

  const paragraphs = narrative.split(/\n\n+/).map(p => p.trim()).filter(Boolean);

  return (
    <div className="space-y-6">
      <article
        className="genre-card rounded-xl px-7 py-8 sm:px-10 sm:py-10 space-y-7 border shadow-sm"
        style={{
          borderColor: 'var(--color-accent-soft)',
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-bg-alt) 92%, transparent), var(--color-bg-alt))',
        }}
      >
        {paragraphs.map((para, i) => (
          <p
            key={i}
            className="text-[1.0625rem] sm:text-[1.08rem] leading-[1.82] tracking-[0.01em]"
            style={{
              color: 'var(--color-text)',
              fontFamily: 'var(--font-body, "Inter", system-ui, sans-serif)',
            }}
          >
            {para}
          </p>
        ))}
      </article>

      {checkpoint && (
        <div
          className="rounded-xl px-5 py-5 sm:px-6 space-y-4 border-t-4"
          style={{
            borderTopColor: 'var(--color-accent)',
            backgroundColor: 'color-mix(in srgb, var(--color-surface) 88%, var(--color-bg) 12%)',
            borderLeft: '1px solid var(--color-accent-soft)',
            borderRight: '1px solid var(--color-accent-soft)',
            borderBottom: '1px solid var(--color-accent-soft)',
          }}
        >
          <p
            className="text-[0.65rem] uppercase tracking-[0.2em] font-semibold opacity-90"
            style={{ color: 'var(--color-accent)' }}
          >
            Your choice
          </p>
          <p
            className="text-sm sm:text-[0.9375rem] leading-snug font-medium"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-body, system-ui, sans-serif)' }}
          >
            {checkpoint.question}
          </p>

          <div className="flex flex-col gap-2.5 pt-1">
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
                  type="button"
                  onClick={() => !submitted && setSelected(i)}
                  disabled={submitted}
                  className="w-full p-3.5 rounded-lg text-[0.9375rem] leading-snug text-left transition-all"
                  style={{
                    border: `2px solid ${borderColor}`,
                    backgroundColor: bg,
                    color: 'var(--color-text)',
                    cursor: submitted ? 'default' : 'pointer',
                    opacity: submitted && i !== selected && i !== correctIndex ? 0.5 : 1,
                    fontFamily: 'var(--font-body, system-ui, sans-serif)',
                  }}
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
              className="w-full genre-button px-4 py-2.5 rounded-lg text-sm font-medium mt-1"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--btn-fg, var(--color-bg))',
                opacity: selected === null ? 0.5 : 1,
                cursor: selected === null ? 'not-allowed' : 'pointer',
              }}
            >
              Lock in your choice
            </button>
          )}

          {submitted && checkpoint.hint && !checkpoint.options[selected]?.correct && (
            <p className="text-sm opacity-80 italic pt-1">{checkpoint.hint}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default StoryBeat;
