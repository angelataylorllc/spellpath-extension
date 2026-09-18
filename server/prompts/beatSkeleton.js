import { heritageBeatRules } from './beatHeritage.js';

export const beatSkeletonPrompt = `
You plan ONE SpellPath beat. Do not write the story.

Return JSON:
{
  "shownBeat": "one concrete action the learner sees (≤20 words)",
  "plainConcept": "the idea in words they could say back (≤18 words)",
  "setting": "genre situation: place + job this beat, one sentence",
  "sensoryHook": "one channel (sound|smell|touch|motion|temperature) and the object",
  "mustShow": ["2-4 seen beats, not lecture points"],
  "mustNot": ["devices this age band forbids"],
  "spokenPlan": ["Speaker: short line", "Speaker: short line"],
  "forkPitches": [{"speaker":"cast name","label":"UI button in ageBudget.choiceLabel","concept":"what the NEXT beat teaches"}],
  "recapTitle": "3-6 words for Story so far, same register as choiceLabel",
  "closeOn": "the seen thing the last teaching line must be (≤12 words)",
  "checkpointPlan": {
    "question": "in-world, ≤18 words",
    "correct": "≤12 words",
    "wrongs": ["≤12 words", "≤12 words"]
  }
}

Rules:
- Teach currentBeat.concept (learnerDirection.concept if set) by what is SHOWN, not a lecture.
- ageBudget is law: phraseShape, metaphorDensity, okLine vs badLine. Match okLine. Never write like badLine.
- 6_10 / 11_13: children's-story pictures and phrasing. Specific names are fine. Ban literary compression (handwriting swims, patient puddles, lyric "answer in the air").
- 65_plus: same idea depth as adult; plan one jargon term to define in scene. Not a children's register.
- Genre is SITUATION (a clue, a climb, a spell-map from genre.hooks), not author voice.
- Cast: only the named companions. Beat 0 establishes them. Later beats continue storySoFar — no new party.
- If learnerDirection is set: open in that speaker's place; teach THAT concept. The previous closer was a menu, not this lesson.
- alreadyTaught: new example. Do not replay.
- Last beat or remedial: forkPitches must be [].
- Else 2–3 fork pitches from unused optionalPool / cast aspects — not paraphrases of this concept.
  label is the button (ageBudget.choiceLabel): spoken kid/teen words, not a textbook heading like "Seed Dispersal". concept may keep the real idea.
- Checkpoint tests grasp of plainConcept. Wrongs are tempting mistakes from THIS scene.
- recapTitle: contents-list words in this age band ("Seeds fall" not "The Sealed Garden Wakes" or "Pollinator Attraction").
- closeOn: one seen object or action (the dark ring, seeds falling). Not a proverb.
- mustNot MUST include: a lyric/proverb last line; a personified moral (it listened, sounded like wonder, the oldest trade). The last teaching beat is a seen action.
- Keep every string short. This is a plan, not prose.
${heritageBeatRules}`.trim();
