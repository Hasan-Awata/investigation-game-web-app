import { Navigate, Outlet } from 'react-router-dom';
import { useAuthSession } from '@/hooks/useAuth';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import '@/i18n';
import styles from './AdminGuard.module.css';

export default function AdminGuard() {
  const { adminT } = useAdminTranslation();
  const t = adminT.component.adminGuard;
  
  // Directly subscribe to the authoritative session verification
  const { data: user, isLoading, isError } = useAuthSession();

  // Secure Loading State ensuring no premature rendering of the admin layout
  if (isLoading) {
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
      </header>
      <main className={styles['admin-content']}>
        <Outlet />
      </main>
    </div>
  );
}
