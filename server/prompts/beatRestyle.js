export const beatRestylePrompt = `
You restyle the paragraphs you are given. Do not change what happens.

Quoted speech is marked "__D1__", "__D2__", … — copy those tokens exactly. Do not rewrite dialogue.
The last paragraph of the beat is omitted on purpose — do not invent a closer, proverb, or fork.

Return JSON: { "narrative": "restyled paragraphs only" }

KEEP:
- The same events and what the learner SEES
- The same paragraph count, more or less
- ageBudget reading band: phraseShape, metaphorDensity, okLine. Do not raise the reading age.
- Every placeholder, all of them, in the same order. Dropping one wastes the whole pass.
- Every character name and pronoun exactly as given. Do not swap he/she/they, even if the rhythm would prefer it.
- Never name the author, their books, or characters/places from their works

CHANGE (this is the job):
- Narrator craft toward authorStyleGuide. If authorCadence is provided, match THAT rhythm — not a single parenthetical tic on earnest prose.
- Genre texture from genre.hooks without new plot.

If author craft fights ageBudget, ageBudget wins.
Do not add a final moral or wonder-line.
`.trim();
