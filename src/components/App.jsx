import { useState } from 'react';
import '../index.css';
import '../styles/genres.css';
import '../styles/theme-system.css';
import { useTheme } from '../contexts/ThemeContext';
import { Settings } from './Settings';

const STORY_GENRES = [
  { id: 'scifi', name: '🚀 Sci-Fi', description: 'Space exploration and futuristic learning', icon: '🚀', theme: 'scifi' },
  { id: 'fantasy', name: '🧙‍♂️ Fantasy', description: 'Magical quests and enchanted knowledge', icon: '🧙‍♂️', theme: 'fantasy' },
  { id: 'detective', name: '🔍 Mystery', description: 'Mystery solving and clue gathering', icon: '🔍', theme: 'mystery' },
  { id: 'horror', name: '👻 Horror', description: 'Spooky discoveries and dark secrets', icon: '👻', theme: 'horror' },
  { id: 'adventure', name: '🗺️ Action/Adventure', description: 'Thrilling expeditions and challenges', icon: '🗺️', theme: 'adventure' }
];

function App() {
  const { theme, setTheme } = useTheme();
  const [subject, setSubject] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentPhase, setCurrentPhase] = useState("input"); // input, quiz, story
  const [quizData, setQuizData] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [showSettings, setShowSettings] = useState(false);

  const handleGenreSelect = (genreId) => {
    setSelectedGenre(genreId);
    // Also set the theme when a genre is selected
    const genre = STORY_GENRES.find(g => g.id === genreId);
    if (genre && genre.theme) {
      setTheme(genre.theme);
    }
  };

  const handleSubjectSubmit = (e) => {
    e.preventDefault();
    if (subject.trim() && selectedGenre) {
      setIsAnalyzing(true);

      // Simulate AI analysis and quiz generation
      setTimeout(() => {
        const generatedQuiz = generateAdaptiveQuiz(subject, selectedGenre);
        setQuizData(generatedQuiz);
        setCurrentPhase("quiz");
        setIsAnalyzing(false);
      }, 2000);
    }
  };

  const generateAdaptiveQuiz = (subject, genre) => {
    // Placeholder: will be AI-generated later
    return {
      subject: subject,
      genre: genre,
      questions: [
        {
          id: 1,
          text: `What's your experience level with ${subject}?`,
          type: 'difficulty_assessment',
          choices: [
            { label: "Complete beginner", value: "beginner", next: 2 },
            { label: "Some knowledge", value: "intermediate", next: 3 },
            { label: "Quite experienced", value: "advanced", next: 4 }
          ]
        },
        {
          id: 2,
          text: `Let's start with the basics of ${subject}. What do you think this concept means?`,
          type: 'concept_check',
          difficulty: 'beginner',
          choices: [
            { label: "I'm not sure", value: "unknown", next: 5 },
            { label: "I have some idea", value: "partial", next: 6 }
          ]
        },
        // More questions will be generated based on previous answers
      ]
    };
  };

  const handleQuizAnswer = (answer, questionId) => {
    const newAnswers = [...userAnswers, { questionId, answer }];
    setUserAnswers(newAnswers);

    const currentQ = quizData.questions.find(q => q.id === questionId);
    const selectedChoice = currentQ.choices.find(c => c.value === answer);

    if (selectedChoice.next) {
      setCurrentQuestion(selectedChoice.next - 1); // array index
    } else {
      setCurrentPhase("story");
    }
  };

  // INPUT PHASE
  if (currentPhase === "input") {
    return (
      <>
        <main className="scene">
          <div className="min-w-[350px] p-6 text-center">
            <div className="mb-6 relative">
              <button
                onClick={() => setShowSettings(true)}
                className="absolute top-0 right-0 p-2 rounded-lg hover:bg-opacity-20 transition-colors"
                style={{ 
                  backgroundColor: 'var(--color-accent-soft)',
                  color: 'var(--color-text)'
                }}
                aria-label="Open settings"
                title="Settings"
              >
                ⚙️
              </button>
              <h1 className="text-3xl font-bold mb-2 tracking-wide genre-title">StoryPath</h1>
              <p className="text-base opacity-80">Choose your learning adventure</p>
            </div>

          <form onSubmit={handleSubjectSubmit} className="space-y-6">
            <div className="genre-card p-4 rounded-lg border">
              <label className="block text-sm font-medium mb-3">
                What would you like to learn?
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., quantum physics, medieval cooking, JavaScript..."
                className="w-full px-4 py-3 genre-input rounded-lg focus:outline-none"
                disabled={isAnalyzing}
              />
            </div>

            <div className="genre-card p-4 rounded-lg border">
              <label className="block text-sm font-medium mb-3">
                Choose your story style
              </label>
              <div className="grid grid-cols-1 gap-3">
                {STORY_GENRES.map(genre => (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => handleGenreSelect(genre.id)}
                    className="p-4 rounded-lg border-2 transition-all duration-300 text-left"
                    style={{
                      borderColor: selectedGenre === genre.id 
                        ? 'var(--color-accent)' 
                        : 'var(--color-accent-soft)',
                      backgroundColor: selectedGenre === genre.id 
                        ? 'var(--color-accent-soft)' 
                        : 'var(--color-bg-alt)',
                      boxShadow: selectedGenre === genre.id ? '0 4px 6px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{genre.icon}</span>
                      <div>
                        <div className="font-semibold" style={{ color: 'var(--color-text)' }}>
                          {genre.name}
                        </div>
                        <div className="text-sm opacity-80" style={{ color: 'var(--color-text-muted)' }}>
                          {genre.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!subject.trim() || !selectedGenre || isAnalyzing}
              className="w-full genre-button px-6 py-3 rounded-lg text-base font-medium"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-bg)',
                opacity: (!subject.trim() || !selectedGenre || isAnalyzing) ? 0.5 : 1,
                cursor: (!subject.trim() || !selectedGenre || isAnalyzing) ? 'not-allowed' : 'pointer',
              }}
            >
              {isAnalyzing ? "Analyzing topic and creating quiz..." : "Begin Your Adventure"}
            </button>
          </form>
        </div>
      </main>
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      </>
    );
  }

  // QUIZ PHASE
  if (currentPhase === "quiz" && quizData) {
    const question = quizData.questions[currentQuestion];
    const currentGenre = STORY_GENRES.find(g => g.id === quizData.genre);

    return (
      <>
      <main className="scene">
        <div className="min-w-[350px] p-6 text-center">
          <div className="mb-6">
            <button
              onClick={() => setCurrentPhase("input")}
              className="text-sm mb-3 flex items-center space-x-1 opacity-90 hover:opacity-100"
            >
              <span>←</span>
              <span>Choose different topic</span>
            </button>
            <div className="genre-card p-3 rounded-lg">
              <p className="text-xs opacity-80">
                Learning: <span className="font-medium">{quizData.subject}</span> |{" "}
                Style: <span className="font-medium">{currentGenre?.name}</span>
              </p>
            </div>
          </div>

          <div className="genre-card p-6 rounded-lg mb-6">
            <p className="text-sm opacity-80 mb-3">
              Question {currentQuestion + 1} of {quizData.questions.length}
            </p>
            <p className="text-lg font-medium mb-6">{question.text}</p>

            <div className="flex flex-col gap-3">
              {question.choices.map((choice, i) => (
                <button
                  key={i}
                  onClick={() => handleQuizAnswer(choice.value, question.id)}
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
        </div>
      </main>
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      </>
    );
  }

  // STORY PHASE
  if (currentPhase === "story" && quizData) {
    const currentGenre = STORY_GENRES.find(g => g.id === quizData.genre);

    return (
      <>
      <main className="scene">
        <div className="min-w-[350px] p-6 text-center">
          <div className="genre-card p-6 rounded-lg mb-6">
            <h2 className="text-2xl font-bold mb-4 genre-title">Your Story Begins!</h2>
            <p className="text-base mb-4">
              Based on your quiz answers, we're crafting a personalized {currentGenre?.name} story about {quizData.subject}.
            </p>
            <p className="text-sm opacity-80">AI story generation coming next!</p>
          </div>

          <button
            onClick={() => setCurrentPhase("input")}
            className="genre-button px-6 py-3 rounded-lg text-base font-medium"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-bg)',
            }}
          >
            Start New Adventure
          </button>
        </div>
      </main>
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      </>
    );
  }

  return null;
}

export default App;
