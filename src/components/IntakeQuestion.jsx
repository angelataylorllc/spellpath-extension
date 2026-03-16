import { useState } from 'react';

const IntakeQuestion = ({ question, onAnswer }) => {
  const [inputValue, setInputValue] = useState('');

  if (!question) return null;

  const { type, text, choices, placeholder } = question;

  const handleSubmitInput = () => {
    if (!inputValue.trim()) return;
    onAnswer(inputValue.trim(), question.id);
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && type === 'text') {
      e.preventDefault();
      handleSubmitInput();
    }
    if (e.key === 'Enter' && e.metaKey && type === 'textarea') {
      e.preventDefault();
      handleSubmitInput();
    }
  };

  // --- Choice ---
  if (type === 'choice' && choices) {
    return (
      <div className="space-y-4">
        <p className="text-lg font-medium">{text}</p>
        <div className="flex flex-col gap-3">
          {choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => onAnswer(choice.value, question.id)}
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
    );
  }

  // --- Text ---
  if (type === 'text') {
    return (
      <div className="space-y-4">
        <p className="text-lg font-medium">{text}</p>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Type your answer...'}
          className="w-full px-4 py-3 genre-input rounded-lg focus:outline-none"
          autoFocus
        />
        <button
          onClick={handleSubmitInput}
          disabled={!inputValue.trim()}
          className="w-full genre-button px-4 py-3 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'var(--btn-fg, var(--color-bg))',
            opacity: !inputValue.trim() ? 0.5 : 1,
            cursor: !inputValue.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          Continue
        </button>
      </div>
    );
  }

  // --- Textarea ---
  if (type === 'textarea') {
    return (
      <div className="space-y-4">
        <p className="text-lg font-medium">{text}</p>
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Share your thoughts...'}
          rows={4}
          className="w-full px-4 py-3 genre-input rounded-lg focus:outline-none resize-none"
          autoFocus
        />
        <div className="flex gap-3">
          <button
            onClick={handleSubmitInput}
            disabled={!inputValue.trim()}
            className="flex-1 genre-button px-4 py-3 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--btn-fg, var(--color-bg))',
              opacity: !inputValue.trim() ? 0.5 : 1,
              cursor: !inputValue.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            Continue
          </button>
          <button
            onClick={() => onAnswer('', question.id)}
            className="px-4 py-3 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: 'var(--color-bg-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-accent-soft)',
            }}
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  // --- Fill in the blank ---
  if (type === 'fill_blank') {
    const parts = text.split('___');
    return (
      <div className="space-y-4">
        <p className="text-lg font-medium leading-relaxed">
          {parts[0]}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || '...'}
            className="inline-block mx-1 px-3 py-1 genre-input rounded focus:outline-none"
            style={{
              minWidth: '120px',
              maxWidth: '200px',
              borderBottom: '2px solid var(--color-accent)',
            }}
            autoFocus
          />
          {parts[1] || ''}
        </p>
        <button
          onClick={handleSubmitInput}
          disabled={!inputValue.trim()}
          className="w-full genre-button px-4 py-3 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'var(--btn-fg, var(--color-bg))',
            opacity: !inputValue.trim() ? 0.5 : 1,
            cursor: !inputValue.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          Continue
        </button>
      </div>
    );
  }

  return <p className="text-sm opacity-60">Unknown question type: {type}</p>;
};

export default IntakeQuestion;
