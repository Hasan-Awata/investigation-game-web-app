import { Navigate, Outlet } from 'react-router-dom';

interface AdminGuardProps {
  user: { is_admin?: boolean } | null;
}

export default function AdminGuard({ user }: AdminGuardProps) {
  // If no user data or they lack the admin flag, bounce them to the main menu
  if (!user || !user.is_admin) {
    return <Navigate to="/" replace />;
  }

  // Otherwise, render the nested admin routes
  return (
    <div className="admin-layout">
      <header className="admin-header glass-panel" style={{ padding: '1rem 2rem', borderBottom: '1px solid rgba(255,51,102,0.3)' }}>
        <h2 style={{ margin: 0, color: 'var(--accent-crimson)', fontFamily: 'var(--font-mono)' }}>System Oversight // Admin Root</h2>
      </header>
      <main className="admin-content" style={{ padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  );
}