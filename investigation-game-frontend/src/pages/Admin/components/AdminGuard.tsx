import { Navigate, Outlet } from 'react-router-dom';
import { useAuthSession } from '@/hooks/useAuth';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import '@/i18n';
import styles from './AdminGuard.module.css';
import LanguageToggle from '@/components/LanguageToggle';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FORBIDDEN_EVENT, type ForbiddenDetail } from '@/services/request';

export default function AdminGuard() {
  const client = useQueryClient();
  const [denied, setDenied] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    const filters = { predicate: (query: { queryKey: readonly unknown[] }) => String(query.queryKey[0]).startsWith('admin') };
    void client.cancelQueries(filters).then(() => {
      if (!active) return;
      client.removeQueries(filters);
      setReady(true);
    });
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<ForbiddenDetail>).detail;
      if (!detail.endpoint.startsWith('/admin/')) return;
      setDenied(detail.message);
      void client.cancelQueries(filters);
      client.removeQueries(filters);
    };
    window.addEventListener(FORBIDDEN_EVENT, listener);
    return () => { active = false; window.removeEventListener(FORBIDDEN_EVENT, listener); };
  }, [client]);
  const { adminT } = useAdminTranslation();
  const t = adminT.component.adminGuard;
  
  // Directly subscribe to the authoritative session verification
  const { data: user, isLoading, isError } = useAuthSession();
  if (denied) return <div role="alert">{denied} <a href="/">Return to menu</a></div>;

  // Secure Loading State ensuring no premature rendering of the admin layout
  if (isLoading || !ready) {
    return (
      <div className={styles['admin-loading']}>
        <div className={`terminal-text ${styles['admin-loading-text']}`}>
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
    <div className={styles['admin-layout']}>
      <header className={styles['admin-header']}>
        <h2 className={styles['admin-header-title']}>{t.dashboardTitle}</h2>
        <LanguageToggle />
      </header>
      <main className={styles['admin-content']}>
        <Outlet />
      </main>
    </div>
  );
}
