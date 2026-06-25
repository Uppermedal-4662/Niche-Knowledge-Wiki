'use client';

import { useState, useEffect } from 'react';

interface Member {
  id: string;
  role: string;
  user: { id: string; email: string; name: string | null };
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/members')
      .then((r) => r.json())
      .then((data) => { setMembers(data); setLoading(false); });
  }, []);

  const invite = async () => {
    const res = await fetch('/api/members/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role: 'MEMBER' }),
    });
    if (res.ok) {
      const member = await res.json();
      setMembers([...members, member]);
      setEmail('');
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/members/${id}`, { method: 'DELETE' });
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
