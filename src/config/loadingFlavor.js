/** Shown only on the post-quiz wait (scaffold + first beat). Not pipeline status. */
export const LOADING_FLAVOR = {
  fantasy: [
    'Unrolling the map by moonlight…',
    'Asking the grove what it remembers…',
    'The lantern catches. Keep walking.',
    'A path is choosing you back.',
    'The old stones are warming up.',
    'Someone left a token at the gate.',
    'The mist is thinning. Almost.',
    'A distant bell. That’s our cue.',
    'The story is finding its first step.',
  ],
  scifi: [
    'The archive is still booting…',
    'Aligning the comms array…',
    'Airlock cycling. Don’t rush the seal.',
    'Telemetry’s messy. That’s normal.',
    'Hull lights just came on.',
    'The nav computer wants another second.',
    'Gravity’s settling. Hold still.',
    'A ping from the far side of the bay.',
    'The story is finding its first step.',
  ],
  mystery: [
    'Spreading the files on the desk…',
    'The witness hasn’t sat down yet.',
    'One more pass at the timeline…',
    'Someone left a light on in the next room.',
    'The kettle’s on. Cases start this way.',
    'A name on the blotter we haven’t met.',
    'The clock on the wall is two minutes fast.',
    'Rain on the glass. Good thinking weather.',
    'The story is finding its first step.',
  ],
  horror: [
    'The hallway is longer than it was.',
    'Something in the walls went quiet.',
    'Don’t turn around just yet.',
    'The house is deciding if you’re a guest.',
    'A door that was closed isn’t.',
    'The photograph looks newer than it should.',
    'Hold your breath. Count to four.',
    'Footsteps upstairs. We’re alone, though.',
    'The story is finding its first step.',
  ],
  adventure: [
    'Tightening the pack straps…',
    'The river’s louder from here.',
    'Checking the rope one more time.',
    'Weather’s turning. We go anyway.',
    'Boots on. Dust on the map.',
    'The trail marker is half-buried.',
    'A ridge wind. That’s the way over.',
    'Canteen’s full. Don’t waste the light.',
    'The story is finding its first step.',
  ],
};

export function flavorLinesFor(genre) {
  return LOADING_FLAVOR[genre] || LOADING_FLAVOR.adventure;
}
