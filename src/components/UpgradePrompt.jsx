import SubscribePlans from './SubscribePlans';

/**
 * Shown when a learner has spent their free stories or this month's plan.
 * @param {{ code: 'free_limit' | 'plan_limit', entitlement: object | null, onBack: () => void }} props
 */
export default function UpgradePrompt({ code, entitlement, onBack }) {
  const outOfPlan = code === 'plan_limit';

  return (
    <div className="genre-card p-6 rounded-lg space-y-4 text-left">
      <h2 className="text-2xl font-bold genre-title">
        {outOfPlan ? 'You’ve used this month’s stories' : 'You’ve used your free stories'}
      </h2>

      <p className="ui-subtitle">
        {outOfPlan
          ? 'Your plan refills at the start of your next billing month. You can move up a plan to keep going now.'
          : 'Pick a plan to keep learning. Every plan refills monthly.'}
      </p>

      {entitlement?.periodEnd && outOfPlan && (
        <p className="text-sm opacity-80">
          Refills on {new Date(entitlement.periodEnd).toLocaleDateString()}.
        </p>
      )}

      <SubscribePlans />

      <div className="pt-2">
        <button
          type="button"
          onClick={onBack}
          className="w-full genre-button ui-btn px-4 py-3 rounded-lg opacity-90"
        >
          Back to start
        </button>
      </div>
    </div>
  );
}
