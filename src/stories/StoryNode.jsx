import React from 'react';

const StoryNode = ({ node, onChoiceSelect }) => {
  if (!node) return null;

  return (
    <div className="min-w-[300px] p-4 text-center font-sans">
      <p className="text-base text-gray-800 mb-4">{node.text}</p>
      <div className="flex flex-col gap-2 items-center">
        {node.choices && node.choices.map((choice, i) => (
          <button
            key={i}
            onClick={() => onChoiceSelect(choice.next)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StoryNode;
