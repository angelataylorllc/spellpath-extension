import { authorNamesForGenre } from './authorVoiceCards.js';

/** Genre voice rules injected into scaffold + beat prompts. */

export const GENRE_VOICE = {
  fantasy: {
    label: 'Fantasy',
    required:
      'Every beat MUST feel fantastical — myth, magic, otherworldly frame, prophecy, ritual, enchanted objects, or liminal crossing. ' +
      'Real-world subjects are taught THROUGH a fantasy lens (e.g. history via ancient grove, spell-map, or priestess oracle — not a museum docent).',
    avoid: 'Plain modern travelogue, textbook history tone, or scenes that could be realistic contemporary fiction with zero wonder.',
    hooks: 'enchanted maps, sacred groves, visions, old magic, fey messengers, cursed relics, moonlit rituals, otherworld gates',
  },
  scifi: {
    label: 'Sci-Fi',
    required:
      'Every beat MUST use sci-fi framing — future tech, alien contact, orbital stations, AI guides, terraforming, time dilation, or speculative devices. ' +
      'Teaching happens through speculative scenario, not a contemporary classroom.',
    avoid: 'Generic modern setting with no speculative element; fantasy magic instead of science/speculation.',
    hooks: 'holographic archives, colony ships, neural links, anomaly scans, first-contact protocols, generation starships',
  },
  mystery: {
    label: 'Mystery',
    required:
      'Every beat MUST unfold as investigation — clues, contradictions, interviews, evidence, red herrings, and deduction. ' +
      'The learner discovers the concept by solving or unraveling something.',
    avoid: 'Straight lecture or tour guide exposition without a puzzle thread.',
    hooks: 'missing ledger, contradictory witness, locked room, coded message, cold case file, rain-soaked alley clue',
  },
  horror: {
    label: 'Horror',
    required:
      'Every beat MUST carry dread atmosphere — isolation, wrongness, creeping threat, or uncanny revelation. ' +
      'Concepts surface through fear and tension, not cozy explanation.',
    avoid: 'Neutral documentary tone; comedic or purely wholesome scenes with no unease.',
    hooks: 'something moved in the walls, old photograph changed, footsteps when alone, ritual gone wrong, fog that whispers',
  },
  adventure: {
    label: 'Action/Adventure',
    required:
      'Every beat MUST have physical stakes — travel, danger, pursuit, survival, racing clock, or bold action. ' +
      'Teaching happens mid-expedition, not sitting in a calm classroom.',
    avoid: 'Static talking-head scenes with no motion, peril, or expedition energy.',
    hooks: 'rope bridge, sandstorm, river crossing, rival expedition, cliff scramble, campfire under threat',
  },
};

export const AUTHOR_EXAMPLES = {
  fantasy: authorNamesForGenre('fantasy'),
  scifi: authorNamesForGenre('scifi'),
  mystery: authorNamesForGenre('mystery'),
  horror: authorNamesForGenre('horror'),
  adventure: authorNamesForGenre('adventure'),
};

export function compactGenreNote(genre) {
  const id = genre || 'adventure';
  const voice = GENRE_VOICE[id] || GENRE_VOICE.adventure;
  return {
    id,
    label: voice.label,
    situation: voice.required,
    avoid: voice.avoid,
    hooks: voice.hooks,
  };
}

export function genreVoicePromptBlock(genre) {
  const voice = GENRE_VOICE[genre] || GENRE_VOICE.adventure;
  return `
GENRE VOICE (${voice.label} — CRITICAL):
- ${voice.required}
- narrativeHint and beat prose must use ${genre} imagery: ${voice.hooks}.
- Avoid: ${voice.avoid}
- The SUBJECT is still what you teach — genre is the wrapper, not the topic. Never ask quiz questions about genre craft.`.trim();
}
