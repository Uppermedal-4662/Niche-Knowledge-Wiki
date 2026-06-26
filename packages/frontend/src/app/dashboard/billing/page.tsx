'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export default function BillingPage() {
  const { getToken } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const authHeaders = async () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${await getToken()}`,
  });

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/billing/subscription', { headers: await authHeaders() });
      const data = await res.json();
      setSubscription(data);
      setLoading(false);
    })();
  }, []);

  const upgrade = async () => {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ priceId: 'price_pro_monthly' }),
    });
    const { url } = await res.json();
    window.location.href = url;
  };

  const manage = async () => {
    const res = await fetch('/api/billing/portal', { headers: await authHeaders() });
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
