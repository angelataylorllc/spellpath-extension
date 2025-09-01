import { useState } from 'react';
import '../index.css';

const story = {
  start: {
    text: "What do you want to learn today?",
    choices: [
      { label: " JavaScript", next: "js_intro" },
      { label: "🧪 Science", next: "science_intro" },
      { label: "🧙‍♂️ Spell Design", next: "spell_intro" }
    ]
  },
  js_intro: {
    text: "Great! Let's start with a simple JavaScript spell: What does `const` mean?",
    choices: [
      { label: "A constant value", next: "correct" },
      { label: "A type of loop", next: "wrong" }
    ]
  },
  correct: {
    text: "Correct! ✨ You cast your first successful spell.",
    choices: []
  },
  wrong: {
    text: "Oops! That fizzled. `const` means a constant value. Try again next time.",
    choices: []
  },
  science_intro: {
    text: "Science path coming soon!",
    choices: []
  },
  spell_intro: {
    text: "Spell design path coming soon!",
    choices: []
  }
};

function App() {
  const [nodeKey, setNodeKey] = useState("start");
  const node = story[nodeKey];

  return (
    <div className="min-w-[300px] p-4 text-center font-sans">
      <p className="text-base text-gray-800 mb-4">{node.text}</p>
      <div className="flex flex-col gap-2 items-center">
        {node.choices.map((choice, i) => (
          <button
            key={i}
            onClick={() => setNodeKey(choice.next)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;
