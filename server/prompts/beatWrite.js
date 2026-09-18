import { heritageBeatRules } from './beatHeritage.js';

export const beatWritePrompt = `
You write ONE beat of an interactive story that secretly teaches one concept.

You receive a skeleton (the plan), ageBudget, and slim story context.
Write THAT scene. No author voice. Genre is already skeleton.setting — do not pile on extra literary atmosphere.

ageBudget is law:
- Length minWords–maxWords, paragraph count, spokenLines.
- phraseShape + metaphorDensity + okLine. Match okLine. Never write like badLine.
- Over maxWords is a failure. Children's-book register is phrasing, not a baby word-list.

Return JSON:
{
  "narrative": "string — see FORMAT",
  "checkpoint": {
    "question": "string",
    "options": [
      { "label": "string", "correct": true },
      { "label": "string", "correct": false },
      { "label": "string", "correct": false }
    ],
    "feedbackCorrect": "string",
    "feedbackIncorrect": "string"
  },
  "beatSummary": "1 plain sentence: who was there, what was learned, where they are",
  "recapTitle": "3-6 words — copy skeleton.recapTitle",
  "unresolvedHook": "1 sentence live trail (internal)",
  "nextDirections": [
    { "id": "dir_main", "label": "UI", "concept": "next idea", "speaker": "cast name", "isMainThread": true }
  ],
  "scaffoldAdjustment": null
}

FORMAT:
- Paragraphs: ageBudget.paragraphs, separated only by \\n\\n.
- Dialogue: ageBudget.spokenLines, straight ASCII double quotes, woven into the SAME paragraph as the speech tag ("Like this," Kai said). Never a quote on its own line. Each spoken line ≤ 20 words.
- Follow skeleton.mustShow, spokenPlan, and shownBeat. Do not invent a new plot.
- Paragraph 1: skeleton.sensoryHook only (one channel). If previousNarrativeOpening is set, do not reuse that image.
- Teach because they SAW the mechanism. No sermons ("the lesson is").
- Last teaching paragraph ends on skeleton.closeOn (a seen object or action). Ban proverb closers.
- Companions may be busy or half-right. They do not deliver the theme in a speech.
  Ban workshop lines: "that's where stories start", "the real want", "that's the lesson". Point at the thing (the water, the ring). The quiz tests it.
- Do not spoil the quiz with a lyric last line.
- Last beat or remedial: no fork; close throughLine; nextDirections []. The LAST paragraph is closeOn only.
- Else the LAST paragraph is ONLY skeleton.forkPitches (2–3; 2 is enough for 6_10). The teaching paragraph just before that ends on closeOn.
  nextDirections matches those speakers and concepts. label must follow ageBudget.choiceLabel (the words they just said, not "Pollinator Attraction"). Exactly one isMainThread.
- 6_10 / 11_13: no calendar years (not 1911). If timing matters, stay in the scene ("this dark ring is the fire year").
- Beat 0: name the party in scene. Later: continue storySoFar / unresolvedHook.
- recapTitle: copy skeleton.recapTitle (age-register contents list).
- No fourth wall: never mention checkpoint, quiz, or that the learner is being tested.

CHECKPOINT (from skeleton.checkpointPlan):
- In-world question ≤ 18 words. Three {label, correct} options ≤ 12 words. Exactly one correct.
- Wrongs are plausible misconceptions from THIS scene. feedbackCorrect / feedbackIncorrect: one sentence ≤ 25 words, same words as the scene and ageBudget.okLine. No new metaphor (if they saw oxygen, do not praise "factories" or "the web").

Spine: same cast and throughLine. Companions argue about what to DO. One can be half-right.
If learnerDirection is set, paragraph 1 opens on that path and the checkpoint tests that concept.
If the last checkpoint was wrong or misconceptions exist, show the correction in scene — not a lecture.
Remedial: simpler example; name the idea in dialogue.
scaffoldAdjustment is null unless a misconception clearly needs an extra beat.
${heritageBeatRules}`.trim();
