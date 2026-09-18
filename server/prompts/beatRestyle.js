export const beatRestylePrompt = `
You restyle the paragraphs you are given. Do not change what happens.

The last paragraph of the beat is omitted on purpose — do not invent a closer, proverb, or fork.

Return JSON: { "narrative": "restyled paragraphs only" }

KEEP:
- The same events and what the learner SEES (the water message, the dark ring, the seeds falling)
- The same paragraph count, more or less
- ageBudget reading band: phraseShape, metaphorDensity, okLine. Do not raise the reading age.
- Straight ASCII double quotes inside paragraphs, with their speech tags
- Never name the author, their books, or characters/places from their works

CHANGE (this is the job):
- Narrator craft toward authorStyleGuide. If authorCadence is provided, match THAT rhythm — not a single parenthetical tic on earnest prose.
- If a companion LECTURES the theme ("that's the real want", "that's where stories start", "the lesson is"), rewrite the line. They can be busy, wrong, dry, or bureaucratic. The narrator may undercut. The checkpoint still tests the idea; the speech must not.
- Genre texture from genre.hooks without new plot.

If author craft fights ageBudget, ageBudget wins.
Do not add a final moral or wonder-line.
`.trim();
