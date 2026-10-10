import { IS_BYOK, IS_CONSUMER } from '../config/edition';

export const SPELLPATH_EDITION_HEADER = 'X-SpellPath-Edition';

/** Tell the API which Chrome build is calling (friends BYOK vs store consumer). */
export function applyEditionHeader(headers) {
  if (IS_CONSUMER) headers.set(SPELLPATH_EDITION_HEADER, 'consumer');
  else if (IS_BYOK) headers.set(SPELLPATH_EDITION_HEADER, 'byok');
}
