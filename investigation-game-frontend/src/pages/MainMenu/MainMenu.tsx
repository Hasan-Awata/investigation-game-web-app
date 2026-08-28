import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { GameCase, User } from '@/types';
import { fetchCases } from '@/services/api';
import CaseCard from '@/components/CaseCard/CaseCard';
import { useQueryClient } from '@tanstack/react-query';
import { logout } from '@/services/auth';
import CaseBriefingModal from '@/components/CaseBriefingModal/CaseBriefingModal';
import './MainMenu.css';

export default function MainMenu() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [selectedCase, setSelectedCase] = useState<GameCase | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const { data: cases = [], isLoading, error } = useQuery({
    queryKey: ['cases'],
    queryFn: async () => {
      const result = await fetchCases();
      if (!result.isSuccess) throw new Error(result.errorMessage);

      // 1. Silently update the browser's cache so it persists on refresh
      localStorage.setItem('auth_user', JSON.stringify(result.value.user));

      // 2. Update the local React state to instantly re-render the XP badge
      setUser(result.value.user);

      // 3. Return the cases to populate the grid
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
    <div className="main-menu-container">

      {/* 1. The New Upper Bar */}
      <div className="upper-bar">
        {user && (
          <div className="user-profile-widget">
            <span className="user-greeting">
              {t('pages.mainMenu.agent')} <span className="user-name-highlight">{user.username}</span>
            </span>
            <span className="xp-badge">{user.XP} {t('pages.mainMenu.xp')}</span>
            <button className="logout-btn" onClick={handleLogout}>{t('pages.mainMenu.logout')}</button>
          </div>
        )}
      </div>

      {/* 2. Existing Header */}
      <header className="menu-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="agency-title">{t('pages.mainMenu.activeInvestigations')}</h1>
          <p className="agency-subtitle">{t('pages.mainMenu.selectDossier')}</p>
        </div>

        {user?.is_admin && (
          <button
            className="btn-secondary"
            onClick={() => navigate('/admin')}
            style={{
              borderColor: 'var(--accent-crimson)',
              color: 'var(--accent-crimson)',
              flex: 'none',
              padding: '0.75rem 1.5rem',
              height: 'fit-content'
            }}
          >
            {t('pages.mainMenu.systemOversight')}
          </button>
        )}
      </header>

      {/* 3. The Cases Grid */}
      <div className="cases-grid">
        {cases.map((gameCase) => (
          <div key={gameCase.id} onClick={() => setSelectedCase(gameCase)}>
            <CaseCard
              gameCase={gameCase}
              imageUrl={gameCase.img_url || '/placeholder-crime-scene.jpg'}
            />
          </div>
        ))}
      </div>

      {selectedCase && (
        <CaseBriefingModal
          gameCase={selectedCase}
          onClose={() => setSelectedCase(null)}
        />
      )}
    </div>
  );
}