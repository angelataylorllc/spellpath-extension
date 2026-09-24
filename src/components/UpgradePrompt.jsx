import { useEffect, useState } from 'react';
import { fetchBillingStatus, openBillingPortal, startCheckout } from '../services/billingApi';

const PLAN_COPY = {
  basic: { price: '$5 / month', detail: '20 stories every month' },
  plus: { price: '$10 / month', detail: '50 stories every month' },
};

/**
 * Shown when a learner has spent their free stories or this month's plan.
 * @param {{ code: 'free_limit' | 'plan_limit', entitlement: object | null, onBack: () => void }} props
 */
export default function UpgradePrompt({ code, entitlement, onBack }) {
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchBillingStatus()
      .then(status => {
        if (!cancelled) setPlans((status.plans || []).filter(plan => plan.available));
      })
      .catch(() => {
        if (!cancelled) setPlans([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const outOfPlan = code === 'plan_limit';

  const handleCheckout = async (planId) => {
    setBusy(planId);
    setError('');
    try {
      await startCheckout(planId);
    } catch (err) {
      setError(err?.message || 'Could not open checkout.');
    } finally {
      setBusy('');
    }
  };

  const handlePortal = async () => {
    setBusy('portal');
    setError('');
    try {
      await openBillingPortal();
    } catch (err) {
      setError(err?.message || 'Could not open your billing page.');
    } finally {
      setBusy('');
    }
  };

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

      <div className="space-y-3">
        {plans.map(plan => (
          <button
            key={plan.id}
            type="button"
            disabled={Boolean(busy)}
            onClick={() => handleCheckout(plan.id)}
            className="w-full genre-button ui-btn px-4 py-3 rounded-lg flex items-baseline justify-between gap-3"
          >
            <span className="font-medium">{PLAN_COPY[plan.id]?.price || plan.label}</span>
            <span className="text-sm opacity-90">{PLAN_COPY[plan.id]?.detail || plan.label}</span>
          </button>
        ))}

        {plans.length === 0 && (
          <p className="text-sm opacity-80">
            Plans aren’t available right now. Please try again shortly.
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm" style={{ color: 'var(--color-accent)' }}>
          {error}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 genre-button ui-btn px-4 py-3 rounded-lg opacity-90"
        >
          Back to start
        </button>
        {outOfPlan && (
          <button
            type="button"
            onClick={handlePortal}
            disabled={Boolean(busy)}
            className="flex-1 genre-button ui-btn px-4 py-3 rounded-lg opacity-90"
          >
            Manage subscription
          </button>
        )}
      </div>
    </div>
  );
}
