import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameCase, User } from '@/types';
import { fetchCases } from '@/services/api';
import CaseCard from '@/components/CaseCard/CaseCard';
import CaseBriefingModal from '@/components/CaseBriefingModal/CaseBriefingModal';
import './MainMenu.css';

export default function MainMenu() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<GameCase[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedCase, setSelectedCase] = useState<GameCase | null>(null);

  useEffect(() => {
    // 1. Load the authenticated user profile
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // 2. Fetch the playable cases
    const loadCases = async () => {
      const result = await fetchCases();
      
      if (result.isSuccess) {
        setCases(result.value);
      } else {
        setError(result.errorMessage);
      }
      
      setIsLoading(false);
    };

    loadCases();
  }, []);

  if (isLoading) return <div className="terminal-text">Decrypting case files...</div>;
  if (error) return <div className="terminal-text error">{error}</div>;

  return (
    <div className="main-menu-container">
      {/* Updated header with Flexbox to align the title and the admin button */}
      <header className="menu-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="agency-title">Active Investigations</h1>
          <p className="agency-subtitle">Select a dossier to initiate the session.</p>
        </div>
        
        {/* Conditional rendering for the Admin Gate */}
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
      
      <div className="cases-grid">
        {cases.map((gameCase) => (
          <div key={gameCase.id} onClick={() => setSelectedCase(gameCase)}>
            <CaseCard 
              gameCase={gameCase} 
              imageUrl={`/assets/cases/case-${gameCase.id}.jpg`} 
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