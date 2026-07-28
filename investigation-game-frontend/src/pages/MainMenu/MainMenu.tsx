import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { GameCase, User } from '@/types';
import { fetchCases } from '@/services/api';
import CaseCard from '@/components/CaseCard/CaseCard';
import CaseBriefingModal from '@/components/CaseBriefingModal/CaseBriefingModal';
import './MainMenu.css';

export default function MainMenu() {
  const navigate = useNavigate();
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
      return result.value;
    }
  });

  const handleLogout = () => {
    // Triggers the global force logout listener in App.tsx
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  };

  if (isLoading) return <div className="terminal-text">Decrypting case files...</div>;
  if (error) return <div className="terminal-text error">{error instanceof Error ? error.message : 'Failed to load cases'}</div>;

  return (
    <div className="main-menu-container">
      
      {/* 1. The New Upper Bar */}
      <div className="upper-bar">
        {user && (
          <div className="user-profile-widget">
            <span className="user-greeting">
              Agent <span className="user-name-highlight">{user.username}</span>
            </span>
            <span className="xp-badge">{user.XP} XP</span>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        )}
      </div>

      {/* 2. Existing Header */}
      <header className="menu-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="agency-title">Active Investigations</h1>
          <p className="agency-subtitle">Select a dossier to initiate the session.</p>
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
            System Oversight
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