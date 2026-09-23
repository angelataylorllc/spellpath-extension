import { heritageBeatRules } from './beatHeritage.js';

export const beatSkeletonPrompt = `
You plan ONE SpellPath beat. Do not write the story.

Return JSON:
{
  "shownBeat": "one action you can film that CHANGES something (≤20 words)",
  "proxyClaim": "the real-world reason the shown thing behaves that way (≤15 words), or \\"\\" if nothing is being stood in for",
  "plainConcept": "the idea in words they could say back (≤18 words)",
  "setting": "genre situation: place + job this beat, one sentence",
  "sensoryHook": "one channel (sound|smell|touch|motion|temperature) and the object",
  "mustShow": ["2-4 seen beats, not lecture points"],
  "mustNot": ["devices this age band forbids"],
  "spokenPlan": ["Speaker: next action, ≤6 words", "..."],
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
- shownBeat must be a CHANGE: something is measurably different after it than before, and the change is caused by an action in the scene. "She swirls the dregs" is not a change. "The marker crosses the line and the walker lurches" is.
- A drawing, diagram, ledger, chart, tally, label, or map that only *represents* the idea is NOT a shown beat. Do not have a character draw or annotate the lesson.
- If the mechanism is invisible (chemistry, biology, physiology, economics), build a PROXY that visibly reacts — something that tips, spills, swells, clouds, changes colour, stops, or spreads. The reader learns by watching the proxy change, not by hearing it described.
- literalness is law. Follow literalness.allegory and literalness.naming. plainConcept and checkpointPlan must obey literalness.checkpoint — on "explicit", plan them in real terms, never in story words. A proxy is never a licence to drop the real subject.
- spokenPlan is what a companion DOES next, one entry per spoken line in ageBudget.spokenLines — a real conversation, not two stray remarks. Reactions, disagreements, orders, complaints and guesses all count. No companion explains the mechanism, and no one asks the lesson for another to answer.
- checkpointPlan must test what shownBeat demonstrates.
- proxyClaim is the physical fact the demonstration rests on, written plainly: "coffee is acidic, so it reddens pH paper". Write it out even though it feels obvious — it is the claim you are betting the beat on.
- Check proxyClaim before you use it. If you cannot state plainly why the proxy behaves that way, pick a different proxy. Never invent a property (what something is made of, what it reacts with, what it contains) to make a prop fit.
- proxyClaim must be about the real world, not the story world. "The Furnace reads the liquid" is not a claim; "caffeine stimulates acid secretion in the stomach" is.
- mustNot MUST include: a lyric/proverb last line; a personified moral (it listened, sounded like wonder, the oldest trade). The last teaching beat is a seen action.
- Keep every string short. This is a plan, not prose.
${heritageBeatRules}`.trim();
