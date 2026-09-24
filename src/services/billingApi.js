import { getAuthorizationHeader } from './auth';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

async function billingFetch(path, options = {}) {
  const headers = new Headers({ 'Content-Type': 'application/json', ...options.headers });
  const authHeader = await getAuthorizationHeader();
  if (authHeader) headers.set('Authorization', authHeader);

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return body;
}

/** Remaining stories, current plan, and which tiers are purchasable. */
export function fetchBillingStatus() {
  return billingFetch('/api/billing/status');
}

/**
 * Stripe Checkout cannot run inside an extension popup, so the hosted page
 * opens in a normal tab.
 * @param {'basic' | 'plus'} plan
 */
export async function startCheckout(plan) {
  const { url } = await billingFetch('/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
  return openInTab(url);
}

/** Stripe's hosted page for changing or cancelling a subscription. */
export async function openBillingPortal() {
  const { url } = await billingFetch('/api/billing/portal', { method: 'POST' });
  return openInTab(url);
}

function openInTab(url) {
  if (!url) throw new Error('No checkout URL returned');
  if (globalThis.chrome?.tabs?.create) {
    globalThis.chrome.tabs.create({ url, active: true });
  } else {
    globalThis.open(url, '_blank', 'noopener');
  }
  return url;
}
