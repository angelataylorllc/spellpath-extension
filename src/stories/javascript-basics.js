export const javascriptBasics = {
  start: {
    text: "What do you want to learn today?",
    choices: [
      { label: "🔢 JavaScript", next: "js_intro" },
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
