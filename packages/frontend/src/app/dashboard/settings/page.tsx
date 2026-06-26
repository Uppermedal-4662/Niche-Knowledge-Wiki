'use client';

import { useState } from 'react';
import { useOrganization, useAuth } from '@clerk/nextjs';

export default function SettingsPage() {
  const { organization } = useOrganization();
  const { getToken } = useAuth();
  const [name, setName] = useState(organization?.name ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!organization) return;
    setSaving(true);
    await fetch(`/api/tenants/${organization.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getToken()}`,
      },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
  };

  if (!organization) return <p>Loading...</p>;

  return (
    <div>
      <h1>Settings</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400 }}>
        <label>Organization Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </div>
  );
}
