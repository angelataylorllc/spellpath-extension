/** Curated author-voice cards (in git). Style signatures only — not plots or quotes. */

const LEGAL_RAILS = [
  'Write original prose only. Do not copy plots, scenes, or quoted lines.',
  'Do not name the author, their books, or characters/places from their works in the narrative.',
  'If this voice conflicts with genre or teaching clarity, keep genre + the lesson, then layer compatible rhythm and diction.',
].join('\n- ');

/**
 * @param {string} name
 * @returns {string}
 */
export function normalizeAuthorKey(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(sir|dame|dr|md|jr|sr|ii|iii|iv)\b/g, ' ')
    .replace(/\b[a-z]\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** @typedef {{ id: string, name: string, genres: string[], note: string, lastNames: string[], aliases?: string[], traits: string[], samples?: string[], worldCaution?: boolean }} AuthorVoiceCard */

/** @type {AuthorVoiceCard[]} */
export const AUTHOR_VOICE_CARDS = [
  {
    id: 'douglas-adams',
    name: 'Douglas Adams',
    genres: ['scifi'],
    note: 'Parenthetical asides, cosmic understatement, bureaucratic absurdity',
    lastNames: ['adams'],
    aliases: ['doug adams'],
    traits: [
      'Parenthetical asides that undercut a grand statement with a smaller, funnier truth',
      'Cosmic scale treated as a mildly inconvenient scheduling problem',
      'Bureaucratic absurdity: forms, procedures, and helpful systems that are not quite help',
      'Dry understatement when the situation is outrageous',
      'Sudden zoom from the galactic to the petty (and back)',
      'Explanations that sound reasonable while describing the unreasonable',
      'Comic timing inside otherwise earnest scientific description',
    ],
    samples: [
      'The machine, designed to inspire confidence, made a small apologetic noise and asked for a form.',
      'It was not, strictly speaking, the end of the world. It was merely adjacent, and slightly behind schedule.',
    ],
  },
  {
    id: 'ray-bradbury',
    name: 'Ray Bradbury',
    genres: ['scifi'],
    note: 'Sensory nostalgia, lyrical lists, wonder edged with melancholy',
    lastNames: ['bradbury'],
    traits: [
      'Sensory nostalgia: ordinary smells, seasons, and small-town textures against the strange',
      'Lyrical catalogs of objects that make a place feel remembered',
      'Wonder mixed with a gentle ache — discovery that costs something quiet',
      'Short ringing sentences after longer, breath-held ones',
      'Metaphor that treats technology as weather, season, or childhood dare',
      'Dialogue that sounds like people talking on a porch, even on another world',
    ],
    samples: [
      'The night smelled like cut grass and warm wiring, and nobody wanted to be the first to go inside.',
    ],
  },
  {
    id: 'philip-k-dick',
    name: 'Philip K. Dick',
    genres: ['scifi'],
    note: 'Paranoid interiority, cheap-future texture, reality that will not sit still',
    lastNames: ['dick'],
    aliases: ['pkd', 'philip dick'],
    traits: [
      'Anxious, flat interiority: the narrator keeps checking whether this moment is real',
      'Cheap future textures — buzzing lights, worn plastic, offices that smell like dust',
      'Bureaucratic dread; authority that cannot quite explain itself',
      'Identity slippage without announcing a twist',
      'Questions that do not resolve; the lesson sits inside the uncertainty',
      'Paranoid noticing of small inconsistencies',
    ],
    samples: [
      'He waited for the room to stay the same when he blinked. It did, which somehow failed to help.',
    ],
  },
  {
    id: 'ursula-k-le-guin',
    name: 'Ursula K. Le Guin',
    genres: ['scifi', 'fantasy'],
    note: 'Quiet anthropological eye, moral weight without sermon, spare dialogue',
    lastNames: ['le guin', 'leguin'],
    aliases: ['le guin', 'leguin', 'ursula le guin'],
    traits: [
      'Quiet anthropological observation: how a people eat, greet, and keep balance',
      'Moral weight without sermonizing — consequences shown, not announced',
      'Spare dialogue; thought moves like landscape',
      'Balance and reciprocity as world-logic',
      'Names and cultures that feel invented for this story, never borrowed',
      'A calm, precise sentence that makes the strange feel already lived-in',
    ],
    samples: [
      'They did not call it a lesson. They called it the way water is shared when the well is low.',
    ],
  },
  {
    id: 'william-gibson',
    name: 'William Gibson',
    genres: ['scifi'],
    note: 'Tech-noir density, cool affect, street-level future clutter',
    lastNames: ['gibson'],
    traits: [
      'Dense sensory tech-noir: rain, signage, chrome, and leftover heat from machines',
      'Cool affect; information arrives as texture, not a lecture',
      'Street-level close-ups of future clutter',
      'Short clauses; brand-like neologisms invented for this world only',
      'The lesson hides in how a system is used, not in a textbook aside',
      'Dialogue that underplays awe',
    ],
    samples: [
      'The kiosk sold three kinds of silence and one map that lied in a useful way.',
    ],
  },
  {
    id: 'terry-pratchett',
    name: 'Terry Pratchett',
    genres: ['fantasy'],
    note: 'Satirical asides, comic logic, warm cynicism about systems',
    lastNames: ['pratchett'],
    traits: [
      'Footnote-ready asides (use parentheticals in prose, not actual footnotes)',
      'Satire of institutions via fantasy jobs and procedures',
      'Puns and comic logic that still land the teaching point',
      'Warm cynicism: ordinary people against large, silly systems',
      'A joke that snaps back into the lesson instead of replacing it',
      'Narration that notices the gap between how things are supposed to work and how they do',
    ],
    samples: [
      'There was a rule for this. There was also, unfortunately, a person whose job was the rule.',
    ],
  },
  {
    id: 'neil-gaiman',
    name: 'Neil Gaiman',
    genres: ['fantasy'],
    note: 'Fairy-tale cadence, matter-of-fact uncanny, dark whimsy',
    lastNames: ['gaiman'],
    traits: [
      'Fairy-tale cadence in modern or mythic settings',
      'The uncanny treated as matter-of-fact, like weather',
      'Dark whimsy; courtesy with something watching underneath',
      'Threshold crossings: doors, dusk, names that feel like stories',
      'Quiet menace under politeness',
      'A telling voice that sounds like it has always known this path',
    ],
    samples: [
      'The door had always been there. People simply had not needed it until tonight.',
    ],
  },
  {
    id: 'jrr-tolkien',
    name: 'J.R.R. Tolkien',
    genres: ['fantasy'],
    note: 'Mythic cadence and elevated diction — original lands, never his names or places',
    lastNames: ['tolkien'],
    aliases: ['jrr tolkien', 'tolkein'],
    worldCaution: true,
    traits: [
      'Elevated, archaic-tinged diction — cadence only, original world',
      'Landscape as character: weather, walking, and old stone that remembers',
      'Invented epithets and place-feeling for THIS story alone',
      'A sense of deep time without dumping a fake history lecture',
      'Companions named in the manner of a traveling company, never his',
      'Wonder spoken with gravity rather than joke',
    ],
    samples: [
      'The road bent under the pines as if it were older than the map that claimed it.',
    ],
  },
  {
    id: 'george-rr-martin',
    name: 'George R.R. Martin',
    genres: ['fantasy'],
    note: 'Gritty sensory politics — original houses and lands, never his names',
    lastNames: ['martin'],
    aliases: ['grrm', 'george rr martin', 'george martin'],
    worldCaution: true,
    traits: [
      'Grounded political and survival texture: meals, weather, bodily cost',
      'Moral gray shown through choices, not nihilist speeches',
      'Limited POV closeness (learner remains the camera)',
      'Gritty sensory detail: cold, smoke, hunger, the weight of a decision',
      'Power as logistics and loyalty, invented for this world',
      'Dialogue that bargains, tests, and withholds',
    ],
    samples: [
      'The stew was thin and the news was thinner, and both had to last until morning.',
    ],
  },
  {
    id: 'stephen-king',
    name: 'Stephen King',
    genres: ['horror'],
    note: 'Plainspoken dread, ordinary rooms going wrong, looping interior fear',
    lastNames: ['king'],
    traits: [
      'Plainspoken American voice; the strange arrives in an ordinary room',
      'Slow dread through small wrong details',
      'Interior monologue that loops on fear and then notices something else is off',
      'Pop-culture-adjacent texture that stays original to this story',
      'Friendship and local talk as the last warm light',
      'Horror that teaches by making the concept feel like a rule you violated',
    ],
    samples: [
      'The porch light buzzed the way it always had. That was the problem: it always had, even now.',
    ],
  },
  {
    id: 'shirley-jackson',
    name: 'Shirley Jackson',
    genres: ['horror'],
    note: 'Civil surface over social cruelty, precise domestic unease',
    lastNames: ['jackson'],
    traits: [
      'A civil, almost helpful surface over social cruelty',
      'Precise domestic detail: kettles, lists, the arrangement of chairs',
      'The uncanny in a polite room',
      'Explanation withheld; the reader (and learner) assembles it',
      'Quiet sentences that land like a door closing',
      'Community rules that are never quite written down',
    ],
    samples: [
      'Everyone agreed it was a sensible plan. That was how you could tell it would not stay sensible.',
    ],
  },
  {
    id: 'mary-shelley',
    name: 'Mary Shelley',
    genres: ['horror'],
    note: 'Romantic awe, testimony energy, creation and consequence',
    lastNames: ['shelley'],
    traits: [
      'Romantic-era elevation: awe, weather, and the sublime',
      'Philosophical horror of making something you cannot unmake',
      'Testimony / confession energy — a mind trying to justify itself',
      'Nature set against human overreach',
      'Formal, earnest diction',
      'Pity and terror in the same long look',
    ],
    samples: [
      'I had asked the night for knowledge. The night, being older, had asked a price.',
    ],
  },
  {
    id: 'edgar-allan-poe',
    name: 'Edgar Allan Poe',
    genres: ['horror'],
    note: 'Obsessive intensity, musical sentences, claustrophobic single-effect mood',
    lastNames: ['poe'],
    aliases: ['edgar poe', 'allan poe'],
    traits: [
      'Obsessive first-person intensity',
      'Musical, incantatory sentences; sound matters as much as sense',
      'Claustrophobia; a single mood held to the end of the beat',
      'Heightened diction; midnight interiors',
      'Dread as logic, not a jump scare',
      'A detail repeated until it becomes a pulse',
    ],
    samples: [
      'I heard it then — not louder, only nearer — as if the idea itself had found a corridor.',
    ],
  },
  {
    id: 'tananarive-due',
    name: 'Tananarive Due',
    genres: ['horror'],
    note: 'Community texture, inherited unease, the past that will not stay buried',
    lastNames: ['due'],
    aliases: ['tananarive'],
    traits: [
      'Historical or community texture with supernatural unease',
      'Horror as inherited weight — the past refusing to stay buried',
      'Specific cultural detail invented for this story, never copied from her plots',
      'Lyrical but grounded sentences',
      'Care for the living people in the room even as the wrongness grows',
      'The lesson arrives as something a family or neighborhood already knew to fear',
    ],
    samples: [
      'Grandmother had a name for this kind of quiet. We had not believed her until the quiet answered.',
    ],
  },
  {
    id: 'jules-verne',
    name: 'Jules Verne',
    genres: ['adventure'],
    note: 'Expedition wonder, catalog of marvels, machines described with delight',
    lastNames: ['verne'],
    traits: [
      'Encyclopedic expedition wonder — measurements as adventure',
      'Inventive machines described with delight, original to this tale',
      'Optimistic curiosity; a catalog of marvels that still teaches',
      'Gentleman-explorer energy without his book plots',
      'Precise how-it-works nested inside a journey',
      'Stakes as distance, weather, and the next apparatus',
    ],
    samples: [
      'We had three miles of river and one instrument that claimed to know the fourth.',
    ],
  },
  {
    id: 'michael-crichton',
    name: 'Michael Crichton',
    genres: ['adventure'],
    note: 'Techno-thriller clarity, expert talk under a countdown, systems going wrong',
    lastNames: ['crichton'],
    traits: [
      'Techno-thriller clarity: the system is explained because it is about to fail',
      'Expert dialogue that teaches under pressure',
      'Research-paper texture at pulp pace',
      'Skepticism arguing with wonder in the same scene',
      'A countdown, a protocol, a thing that should not be this loud',
      'The lesson is a mechanism you can misuse',
    ],
    samples: [
      'The readout was within spec. Spec, it turned out, had not considered this room.',
    ],
  },
  {
    id: 'jack-london',
    name: 'Jack London',
    genres: ['adventure'],
    note: 'Survival diction, indifferent nature, knowledge with a physical cost',
    lastNames: ['london'],
    traits: [
      'Survival diction: cold, hunger, animal will',
      'Nature as an indifferent teacher',
      'Short hard sentences when the body is failing',
      'Physical cost of knowledge — you learn it with your hands and lungs',
      'Man-versus-wild as the classroom, original to this trek',
      'Respect for skill without romantic fog',
    ],
    samples: [
      'The fire took, then thought about it, then took again. That was the whole philosophy of the night.',
    ],
  },
  {
    id: 'robert-louis-stevenson',
    name: 'Robert Louis Stevenson',
    genres: ['adventure'],
    note: 'Brisk adventure cadence, maps and oaths, secrets in the kit bag',
    lastNames: ['stevenson'],
    aliases: ['r l stevenson', 'rl stevenson'],
    traits: [
      'Brisk adventure cadence; the road or the water keeps moving',
      'Moral fog: loyalty, oaths, and a map that is not entirely honest',
      'Boyish momentum with adult consequence',
      'Secrets in the kit bag; a name spoken too late',
      'Sea/road rhythm in the sentences',
      'Wit under danger',
    ],
    samples: [
      'We packed the truth poorly and the rope well, which later seemed like the same mistake.',
    ],
  },
  {
    id: 'alexandre-dumas',
    name: 'Alexandre Dumas',
    genres: ['adventure'],
    note: 'Swashbuckling pace, honor and rivalry, wit under danger',
    lastNames: ['dumas'],
    traits: [
      'Swashbuckling dialogue; honor and plot-speed',
      'Friendship and rivalry as the engine of the scene',
      'Courtly flourish, then a sudden physical beat',
      'Serial cliffhanger energy even inside a teaching moment',
      'Wit under danger; a toast in a doorway',
      'Stakes as loyalty, timing, and a door that will not stay shut',
    ],
    samples: [
      'He bowed as if we had all night. We did not, which he knew, which was the point of the bow.',
    ],
  },
  {
    id: 'agatha-christie',
    name: 'Agatha Christie',
    genres: ['mystery'],
    note: 'Orderly puzzles, social observation as clue, misdirection by manners',
    lastNames: ['christie'],
    worldCaution: true,
    traits: [
      'Orderly puzzle architecture: facts already shown, later rearranged',
      'Social observation as clue — manners that leak information',
      'Drawing-room calm over calculation',
      'Misdirection by politeness, never by naming her detectives',
      'A tidy inventory of who was where, and why that cannot be',
      'The reveal as arrangement, not magic',
    ],
    samples: [
      'Everyone had an alibi. The alibis, unfortunately, had each other.',
    ],
  },
  {
    id: 'arthur-conan-doyle',
    name: 'Arthur Conan Doyle',
    genres: ['mystery'],
    note: 'Observational deduction, brisk case energy — original detectives, never his',
    lastNames: ['doyle', 'conan doyle'],
    aliases: ['conan doyle', 'arthur doyle', 'a c doyle'],
    worldCaution: true,
    traits: [
      'Observational deduction on the page: notice, infer, test',
      'Brisk case energy; the problem is a locked situation, not a lecture',
      'Scientific method as adventure',
      'A companion to hear the reasoning (invented; never his names or rooms)',
      'Small physical clues treated as louder than speeches',
      'Confidence that the world is readable if you look twice',
    ],
    samples: [
      'The mud disagreed with the story, and mud, unlike people, rarely bothers to lie.',
    ],
  },
  {
    id: 'raymond-chandler',
    name: 'Raymond Chandler',
    genres: ['mystery'],
    note: 'Hardboiled metaphor, wry first-person snap, city corruption as weather',
    lastNames: ['chandler'],
    traits: [
      'Hardboiled metaphor invented for this beat — never his famous similes',
      'Cynical knight energy in a dirty city, original streets only',
      'Wry first-person snap',
      'Night offices, rain, and talk that costs something',
      'Corruption as weather',
      'The lesson arrives like a lead you did not want and cannot drop',
    ],
    samples: [
      'The office fan pushed warm air around as if it were doing detective work and coming up empty.',
    ],
  },
  {
    id: 'gillian-flynn',
    name: 'Gillian Flynn',
    genres: ['mystery'],
    note: 'Sharp contemporary unease, unreliable interior, secrets as performance',
    lastNames: ['flynn'],
    traits: [
      'Sharp contemporary psychological unease',
      'Unreliable interior: missing pieces the narrator will not admit yet',
      'Domestic settings with rot underneath',
      'Clipped, stylish sentences',
      'Secrets as social performance',
      'The clue is a relationship that does not match its smile',
    ],
    samples: [
      'We told the useful version of the afternoon. The other version waited in the kitchen, unwashed.',
    ],
  },
  {
    id: 'tana-french',
    name: 'Tana French',
    genres: ['mystery'],
    note: 'Lyrical place-as-psychology, slow-burn interviews, community wound',
    lastNames: ['french'],
    traits: [
      'Lyrical atmosphere; place as psychology (invented town, never hers)',
      'Slow burn; interviews that bruise',
      'Literary sensory weather',
      'The case as a community wound',
      'Interior noticing that is almost too honest',
      'A teaching moment hidden inside who gets believed',
    ],
    samples: [
      'The lane remembered more than the witness did, and it was not in a hurry to share.',
    ],
  },
];

const LAST_NAME_INDEX = (() => {
  /** @type {Map<string, AuthorVoiceCard[]>} */
  const map = new Map();
  for (const card of AUTHOR_VOICE_CARDS) {
    for (const last of card.lastNames || []) {
      const key = normalizeAuthorKey(last);
      if (!key) continue;
      const list = map.get(key) || [];
      list.push(card);
      map.set(key, list);
    }
  }
  return map;
})();

/**
 * @param {AuthorVoiceCard} card
 * @returns {string[]}
 */
function cardKeys(card) {
  const names = [card.name, ...(card.aliases || []), ...(card.lastNames || [])];
  return [...new Set(names.map(normalizeAuthorKey).filter(Boolean))];
}

const GENRE_LIST_ORDER = {
  scifi: ['douglas-adams', 'ray-bradbury', 'philip-k-dick', 'ursula-k-le-guin', 'william-gibson'],
  fantasy: ['terry-pratchett', 'neil-gaiman', 'ursula-k-le-guin', 'jrr-tolkien', 'george-rr-martin'],
  horror: ['stephen-king', 'shirley-jackson', 'mary-shelley', 'edgar-allan-poe', 'tananarive-due'],
  adventure: ['jules-verne', 'michael-crichton', 'jack-london', 'robert-louis-stevenson', 'alexandre-dumas'],
  mystery: ['agatha-christie', 'arthur-conan-doyle', 'raymond-chandler', 'gillian-flynn', 'tana-french'],
};

/**
 * @param {string} genre
 * @returns {AuthorVoiceCard[]}
 */
export function cardsForGenre(genre) {
  const g = String(genre || '').toLowerCase();
  const cards = AUTHOR_VOICE_CARDS.filter((card) => card.genres.includes(g));
  const order = GENRE_LIST_ORDER[g];
  if (!order) return cards;
  return [...cards].sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

/**
 * @param {string} genre
 * @returns {string}
 */
export function authorNamesForGenre(genre) {
  return cardsForGenre(genre).map((card) => card.name).join(', ');
}

/**
 * @param {string} id
 * @returns {AuthorVoiceCard | null}
 */
export function findAuthorCardById(id) {
  return AUTHOR_VOICE_CARDS.find((card) => card.id === id) || null;
}

/**
 * Fuzzy match a typed or selected author name to a curated card.
 * @param {string} name
 * @returns {AuthorVoiceCard | null}
 */
export function findAuthorCard(name) {
  const key = normalizeAuthorKey(name);
  if (!key) return null;

  for (const card of AUTHOR_VOICE_CARDS) {
    if (cardKeys(card).includes(key)) return card;
  }

  const lastHits = LAST_NAME_INDEX.get(key);
  if (lastHits?.length === 1) return lastHits[0];

  const multi = AUTHOR_VOICE_CARDS.filter((card) => {
    return cardKeys(card).some((cardKey) => {
      if (cardKey === key) return true;
      if (key.length >= 5 && (cardKey.endsWith(` ${key}`) || key.endsWith(` ${cardKey}`))) return true;
      return false;
    });
  });
  if (multi.length === 1) return multi[0];
  return null;
}

/**
 * Curated dropdown match for this genre. Unknown / type-in names return false.
 * @param {string} name
 * @param {string} genre
 */
export function authorListedForGenre(name, genre) {
  const card = findAuthorCard(name);
  const g = String(genre || '').toLowerCase();
  return Boolean(card && g && card.genres.includes(g));
}

function worldCautionLine(flag) {
  if (!flag) return '';
  return '- CRITICAL: Invent an original world. Never use this author\'s character names, place names, languages, houses, or signature artifacts.';
}

function formatGuide({ heading, traits, samples, worldCaution }) {
  const traitLines = (traits || []).map((t) => `- ${t}`).join('\n');
  const sampleBlock = samples?.length
    ? `\nOriginal rhythm cues (match cadence only — do not copy these sentences into the story):\n${samples.map((s) => `- ${s}`).join('\n')}`
    : '';
  const caution = worldCautionLine(worldCaution);

  return `
AUTHOR VOICE (${heading}):
Apply these craft traits in original prose:
${traitLines}
${caution}
${sampleBlock}

Legal rails:
- ${LEGAL_RAILS}`.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * @param {AuthorVoiceCard} card
 * @param {{ compact?: boolean }} [opts]
 */
export function formatCuratedAuthorGuide(card, { compact = false, includeSample = false } = {}) {
  return formatGuide({
    heading: `curated — evoke "${card.name}", never name them`,
    traits: compact ? (card.traits || []).slice(0, 5) : card.traits,
    samples: compact
      ? (includeSample ? (card.samples || []).slice(0, 1) : [])
      : card.samples,
    worldCaution: card.worldCaution,
  });
}

/**
 * @param {string} name
 * @param {{ traits?: string[], worldCaution?: boolean, samples?: string[] }} expanded
 */
export function formatExpandedAuthorGuide(name, expanded = {}) {
  return formatGuide({
    heading: `expanded — evoke "${name}", never name them`,
    traits: expanded.traits || [],
    samples: expanded.samples,
    worldCaution: expanded.worldCaution,
  });
}

/**
 * @param {string} name
 */
export function formatGenericAuthorGuide(name) {
  return formatGuide({
    heading: `generic — evoke "${name}", never name them`,
    traits: [
      'Evoke this author\'s prose rhythm, interiority, sensory detail, dialogue cadence, and emotional tone',
      'Prefer craft habits over any famous plot or character',
    ],
  });
}
