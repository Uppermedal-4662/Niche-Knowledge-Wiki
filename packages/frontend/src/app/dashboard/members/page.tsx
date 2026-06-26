'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

interface Member {
  id: string;
  role: string;
  user: { id: string; email: string; name: string | null };
}

export default function MembersPage() {
  const { getToken } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  const authHeaders = async () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${await getToken()}`,
  });

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/members', { headers: await authHeaders() });
      const data = await res.json();
      setMembers(data);
      setLoading(false);
    })();
  }, []);

  const invite = async () => {
    const res = await fetch('/api/members/invite', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ email, role: 'MEMBER' }),
    });
    if (res.ok) {
      const member = await res.json();
      setMembers([...members, member]);
      setEmail('');
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/members/${id}`, { method: 'DELETE', headers: await authHeaders() });
    setMembers(members.filter((m) => m.id !== id));
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Members</h1>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email to invite"
        />
        <button onClick={invite}>Invite</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td>{m.user.name ?? '-'}</td>
              <td>{m.user.email}</td>
              <td>{m.role}</td>
              <td><button onClick={() => remove(m.id)}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
