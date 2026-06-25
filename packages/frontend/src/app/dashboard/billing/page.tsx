'use client';

import { useState, useEffect } from 'react';

export default function BillingPage() {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/billing/subscription')
      .then((r) => r.json())
      .then((data) => { setSubscription(data); setLoading(false); });
  }, []);

  const upgrade = async () => {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId: 'price_pro_monthly' }),
    });
    const { url } = await res.json();
    window.location.href = url;
  };

  const manage = async () => {
    const res = await fetch('/api/billing/portal');
    const { url } = await res.json();
    window.location.href = url;
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Billing</h1>
      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 24, maxWidth: 400 }}>
        <h2>{subscription ? 'Pro Plan' : 'Free Plan'}</h2>
        <p>Status: {subscription?.status ?? 'Active'}</p>
        {subscription && (
          <p>Seats: {subscription.seats}</p>
        )}
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          {!subscription && <button onClick={upgrade}>Upgrade</button>}
          {subscription && <button onClick={manage}>Manage Subscription</button>}
        </div>
      </div>
    </div>
  );
}
