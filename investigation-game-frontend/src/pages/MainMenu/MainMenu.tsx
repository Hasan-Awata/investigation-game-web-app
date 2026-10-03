import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { GameCase, User } from '@/types';
import { fetchCases } from '@/services/api';
import { logout } from '@/services/auth';
import { getLocalUser, AUTH_USER_KEY } from '@/utils/userState';
import { setSafeStorage } from '@/utils/storage';
import CaseBriefingModal from '@/pages/MainMenu/CaseBriefingModal/CaseBriefingModal';
import CaseCard from '@/pages/MainMenu/CaseCard/CaseCard';
import styles from './MainMenu.module.css';

export default function MainMenu() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // Lazy initialiser, NOT `useState(null)` + `useEffect(() => setUser(getLocalUser()))`:
// an unconditional synchronous setState in an effect body trips
// `react-hooks/set-state-in-effect` (the old hydration effect only avoided the
// rule because its setState sat behind an `if`). It also removes a cascading
// render, and it removes a real pre-existing bug: hydration used to call
// JSON.parse on the raw localStorage value with no try/catch, so a corrupted
// payload threw a SyntaxError straight into render. getLocalUser never throws.
const [user, setUser] = useState<User | null>(() => getLocalUser());
  const [selectedCase, setSelectedCase] = useState<GameCase | null>(null);

  const { data: cases = [], isLoading, error } = useQuery({
    queryKey: ['cases'],
    queryFn: async () => {
      const result = await fetchCases();
      if (!result.isSuccess) throw new Error(result.errorMessage);

      setSafeStorage('local', AUTH_USER_KEY, result.value.user);
      setUser(result.value.user);
      return result.value.cases;
    }
  });

  const handleLogout = () => {
    logout();
    queryClient.clear();
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  };

  if (isLoading) return <div className="terminal-text">{t('pages.mainMenu.decrypting')}</div>;
  if (error) return <div className="terminal-text error">{error instanceof Error ? error.message : t('pages.mainMenu.failedToLoad')}</div>;

  return (
    <div className={styles.mainMenuContainer}>
      
      {/* 1. Navbar - Inspired exactly by the reference image */}
      <header className={styles.headerWrapper}>
        <nav className={styles.navbar}>
          <div className={styles.navLinks}>
            {user && (
              <>
                <span className={styles.navText}>
                  <span className={styles.highlight}>{user.username}</span>
                </span>
                <span className={`${styles.navText} ${styles.xpText}`}>
                  {user.XP} {t('pages.mainMenu.xp')}
                </span>
              </>
            )}

            {user?.is_admin && (
              <button className={styles.navLinkBtn} onClick={() => navigate('/admin')}>
                {t('pages.mainMenu.systemOversight')}
              </button>
            )}
          </div>

          {user && (
            <button className={styles.actionBlockBtn} onClick={handleLogout}>
              {t('pages.mainMenu.logout')}
            </button>
          )}
        </nav>
      </header>

      {/* 2. Cases Roster Grid */}
      <main className={styles.rosterSection}>
        <div className={styles.casesGrid}>
          {cases.map((gameCase: GameCase) => (
            <div
              key={gameCase.id}
              className={styles.caseCardWrapper}
              onClick={() => setSelectedCase(gameCase)}
            >
              <CaseCard 
                gameCase={gameCase} 
                imageUrl={gameCase.img_url} 
                userXp={user?.XP || 0}
              />
            </div>
          ))}
        </div>
      </main>

      {selectedCase && (
        <CaseBriefingModal
          gameCase={selectedCase}
          onClose={() => setSelectedCase(null)}
        />
      )}
    </div>
  );
}