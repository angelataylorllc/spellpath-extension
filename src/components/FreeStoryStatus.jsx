/** Default when API predates freeLimit on entitlement (sea0 not restarted yet). */
const DEFAULT_FREE_LIMIT = 3;

/**
 * Consumer: progress through lifetime free stories.
 * @param {{ entitlement: object | null, inStory?: boolean }} props
 * @param {boolean} [props.inStory] — true while playing a reserved story (home shows the *next* slot).
 */
export default function FreeStoryStatus({ entitlement, inStory = false }) {
  if (!entitlement || entitlement.subscribed) return null;

  const freeRemaining = Number(entitlement.freeRemaining);
  if (!Number.isFinite(freeRemaining) || freeRemaining <= 0) return null;

  const freeLimit =
    Number(entitlement.freeLimit) > 0
      ? Number(entitlement.freeLimit)
      : Math.max(freeRemaining, DEFAULT_FREE_LIMIT);

  const used = freeLimit - freeRemaining;
  const onNumber = inStory ? Math.max(1, used) : used + 1;
  if (onNumber < 1 || onNumber > freeLimit) return null;

  return (
    <p className="story-free-status text-base font-medium m-0 mt-2 mb-1">
      You&apos;re on free story {onNumber} of {freeLimit}.
    </p>
  );
}
