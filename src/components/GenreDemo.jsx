import React from 'react';

const STORY_GENRES = [
  { id: 'scifi', name: '🚀 Sci-Fi', description: 'Space exploration and futuristic learning', icon: '🚀' },
  { id: 'fantasy', name: '🧙‍♂️ Fantasy', description: 'Magical quests and enchanted knowledge', icon: '🧙‍♂️' },
  { id: 'detective', name: '🔍 Detective', description: 'Mystery solving and clue gathering', icon: '🔍' },
  { id: 'horror', name: '👻 Horror', description: 'Spooky discoveries and dark secrets', icon: '👻' },
  { id: 'adventure', name: '🗺️ Action/Adventure', description: 'Thrilling expeditions and challenges', icon: '🗺️' }
];

function GenreDemo() {
  return (
    <div className="min-w-[800px] p-8 bg-gradient-to-br from-gray-50 to-white">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-4 tracking-wide">StoryPath Genre Styles</h1>
        <p className="text-lg text-gray-600">Preview of all 5 story genre themes</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {STORY_GENRES.map(genre => (
          <div key={genre.id} className={`${getGenreStyles(genre.id)} p-8 rounded-xl shadow-lg`}>
            <div className="text-center mb-6">
              <span className="text-6xl mb-4 block">{genre.icon}</span>
              <h2 className={`text-3xl font-bold mb-3 genre-title`}>{genre.name}</h2>
              <p className="text-lg text-gray-600">{genre.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="genre-card p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Typography Sample</h3>
                <div className="space-y-3 text-left">
                  <p className="text-2xl font-bold">Heading Text</p>
                  <p className="text-lg font-medium">Subheading Text</p>
                  <p className="text-base">Body text with this genre's font family. Each genre has its own unique typography that matches its personality.</p>
                  <p className="text-sm text-gray-600">Small text and captions</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="genre-card p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 text-gray-800">Interactive Elements</h4>
                  <div className="space-y-3">
                    <button className={`w-full genre-button px-4 py-2 rounded-lg text-sm font-medium ${getGenreButtonStyles(genre.id)}`}>
                      Primary Button
                    </button>
                    <button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300">
                      Secondary Button
                    </button>
                  </div>
                </div>

                <div className="genre-card p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 text-gray-800">Form Elements</h4>
                  <input
                    type="text"
                    placeholder="Sample input field"
                    className="w-full genre-input px-3 py-2 rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-300"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <div className="inline-flex items-center space-x-2 bg-white/50 px-4 py-2 rounded-full">
                <span className="text-sm font-medium text-gray-700">Font Family:</span>
                <span className="text-sm text-gray-600 font-mono">{getFontFamilyName(genre.id)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
        <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">Style System Overview</h3>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Core Elements Styled:</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Color schemes (backgrounds, borders, accents)</li>
              <li>• Typography (fonts, sizes, weights)</li>
              <li>• Interactive elements (buttons, inputs, cards)</li>
              <li>• Spacing & layout (margins, padding, grid systems)</li>
              <li>• Visual flourishes (shadows, transitions, animations)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Genre Personalities:</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• <strong>Sci-Fi:</strong> Blues, tech fonts, geometric shapes</li>
              <li>• <strong>Fantasy:</strong> Purples/pinks, elegant fonts, mystical elements</li>
              <li>• <strong>Detective:</strong> Grays, classic fonts, structured layouts</li>
              <li>• <strong>Horror:</strong> Reds/oranges, bold fonts, dramatic contrasts</li>
              <li>• <strong>Adventure:</strong> Greens, energetic fonts, dynamic layouts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced genre-specific styling
function getGenreStyles(genre) {
  switch (genre) {
    case 'scifi':
      return 'genre-scifi';
    case 'fantasy':
      return 'genre-fantasy';
    case 'detective':
      return 'genre-detective';
    case 'horror':
      return 'genre-horror';
    case 'adventure':
      return 'genre-adventure';
    default:
      return '';
  }
}

// Genre-specific button styling
function getGenreButtonStyles(genre) {
  switch (genre) {
    case 'scifi':
      return 'bg-scifi-600 hover:bg-scifi-700 border-scifi-400';
    case 'fantasy':
      return 'bg-fantasy-600 hover:bg-fantasy-700 border-fantasy-400';
    case 'detective':
      return 'bg-detective-600 hover:bg-detective-700 border-detective-400';
    case 'horror':
      return 'bg-horror-600 hover:bg-horror-700 border-horror-400';
    case 'adventure':
      return 'bg-adventure-600 hover:bg-adventure-700 border-adventure-400';
    default:
      return 'bg-purple-600 hover:bg-purple-700 border-purple-400';
  }
}

// Get font family display names
function getFontFamilyName(genre) {
  switch (genre) {
    case 'scifi':
      return 'Orbitron (Monospace)';
    case 'fantasy':
      return 'Cinzel (Serif)';
    case 'detective':
      return 'Playfair Display (Serif)';
    case 'horror':
      return 'Creepster (Cursive)';
    case 'adventure':
      return 'Bangers (Cursive)';
    default:
      return 'Inter (Sans)';
  }
}

export default GenreDemo;



