import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={{ width: 256, backgroundColor: '#111827', color: '#fff', padding: 16, display: 'flex', flexDirection: 'column' }}>
        <OrganizationSwitcher />
        <nav style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link href="/dashboard" style={{ color: '#9ca3af', textDecoration: 'none' }}>Overview</Link>
          <Link href="/dashboard/members" style={{ color: '#9ca3af', textDecoration: 'none' }}>Members</Link>
          <Link href="/dashboard/settings" style={{ color: '#9ca3af', textDecoration: 'none' }}>Settings</Link>
          <Link href="/dashboard/billing" style={{ color: '#9ca3af', textDecoration: 'none' }}>Billing</Link>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </aside>
      <main style={{ flex: 1, padding: 32 }}>{children}</main>
    </div>
  );
}
