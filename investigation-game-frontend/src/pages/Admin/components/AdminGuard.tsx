import { Navigate, Outlet } from 'react-router-dom';
import { useAuthSession } from '@/hooks/useAuth';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import '@/i18n';

export default function AdminGuard() {
  const { adminT } = useAdminTranslation();
  const t = adminT.component.adminGuard;
  
  // Directly subscribe to the authoritative session verification
  const { data: user, isLoading, isError } = useAuthSession();

  // Secure Loading State ensuring no premature rendering of the admin layout
  if (isLoading) {
    return (
      <div className="admin-layout" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-dark)' }}>
         <div className="terminal-text" style={{ color: 'var(--accent-cyan)' }}>
           {t.loading}
         </div>
      </div>
    );
  }

  // Strictly evaluate the server-provided flag. 
  // If the user attempts access without standard authentication, bounce them.
  if (isError || !user || !user.is_admin) {
    return <Navigate to="/" replace />;
  }

  // Verification passed - yield nested routes
  return (
    <div className="admin-layout">
      <header className="admin-header glass-panel" style={{ padding: '1rem 2rem', borderBottom: '1px solid rgba(255,51,102,0.3)' }}>
        <h2 style={{ margin: 0, color: 'var(--accent-crimson)', fontFamily: 'var(--font-mono)' }}>{t.dashboardTitle}</h2>
      </header>
      <main className="admin-content" style={{ padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  );
}