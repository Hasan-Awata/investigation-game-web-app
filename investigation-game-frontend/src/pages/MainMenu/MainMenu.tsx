// src/pages/MainMenu/MainMenu.tsx
import { useEffect, useState } from 'react';
import type { GameCase } from '../../types';
import { fetchCases } from '../../services/api';
import CaseCard from '../../components/CaseCard/CaseCard';
import CaseBriefingModal from '../../components/CaseBriefingModal/CaseBriefingModal';
import './MainMenu.css';

export default function MainMenu() {
  const [cases, setCases] = useState<GameCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track the currently selected case for the modal
  const [selectedCase, setSelectedCase] = useState<GameCase | null>(null);

  useEffect(() => {
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
      <header className="menu-header">
        <h1 className="agency-title">Active Investigations</h1>
        <p className="agency-subtitle">Select a dossier to initiate the session.</p>
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

      {/* Conditionally render the modal overlay */}
      {selectedCase && (
        <CaseBriefingModal 
          gameCase={selectedCase} 
          onClose={() => setSelectedCase(null)} 
        />
      )}
    </div>
  );
}