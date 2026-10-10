import { useState } from 'react';
import { startCheckout } from '../services/billingApi';
import { BILLING_PLAN_COPY } from './billingPlanCopy';

const PLAN_IDS = ['basic', 'plus'];

/** $5 / $10 buttons → Stripe Checkout (shared by quota upgrade and Billing gear). */
export default function SubscribePlans() {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const handleCheckout = async planId => {
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

  return (
    <div className="space-y-3">
      {PLAN_IDS.map(planId => (
        <button
          key={planId}
          type="button"
          disabled={Boolean(busy)}
          onClick={() => handleCheckout(planId)}
          className="w-full genre-button ui-btn px-4 py-3 rounded-lg flex items-baseline justify-between gap-3"
        >
          <span className="font-medium">{BILLING_PLAN_COPY[planId].price}</span>
          <span className="text-sm opacity-90">{BILLING_PLAN_COPY[planId].detail}</span>
        </button>
      ))}

      {error && (
        <p className="text-sm" style={{ color: 'var(--color-accent)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
