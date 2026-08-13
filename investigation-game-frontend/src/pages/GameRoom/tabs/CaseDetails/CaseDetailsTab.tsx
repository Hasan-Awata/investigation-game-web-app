// FILE: src/pages/GameRoom/tabs/CaseDetails/CaseDetailsTab.tsx

import { useState } from 'react';
import { useRoomState, useRoomActions } from '../../../../context/RoomContext';
import VictimModal from './VictimModal';
import type { Victim } from '../../../../types';
import '../SharedOverlay.css';
import './CaseDetailsTab.css';

export default function CaseDetailsTab() {
  const { room, accumulatedVictims, viewedVictims } = useRoomState();
  const { markVictimAsViewed } = useRoomActions();
  
  const [inspectedVictim, setInspectedVictim] = useState<Victim | null>(null);
  
  const gameCase = room.game_case || {
    id: room.case_id,
    title: "Case Data Missing",
    story: "The case metadata was not eager-loaded by the server.",
    min_player_XP: 0,
    XP_on_solve: 0,
    img_url: null
  };

  const heroImageUrl = gameCase.img_url || '/placeholder-crime-scene.jpg'; 

  const handleInspectVictim = (victim: Victim) => {
    markVictimAsViewed(victim.id);
    setInspectedVictim(victim);
  };

  return (
    <div className="case-details-tab">
      <div className="case-hero-header">
        <div 
          className="case-hero-background" 
          style={{ backgroundImage: `url(${heroImageUrl}), url('/placeholder-crime-scene.jpg')` }}
        />
        <div className="case-hero-overlay">
          <div className="case-hero-content">
            <h1 className="case-hero-title">{gameCase.title}</h1>
            <div className="case-hero-badges">
              <span className="badge">Min XP: {gameCase.min_player_XP}</span>
              <span className="badge reward">Reward: {gameCase.XP_on_solve} XP</span>
            </div>
          </div>
        </div>
      </div>

      <div className="case-full-story">
        <h2 className="section-title">Official Briefing</h2>
        <div className="story-text-block">
          {gameCase.story.split('\n').map((paragraph: string, idx: number) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>
      </div>

      {accumulatedVictims.length > 0 && (
        <div className="case-victims-section" style={{ marginTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '3rem' }}>
          <h2 className="section-title" style={{ borderColor: 'var(--accent-crimson)', color: 'var(--accent-crimson)' }}>Identified Casualties</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
            {accumulatedVictims.map((victim: Victim) => {
              const isNew = !viewedVictims.has(victim.id);
              
              return (
                <div 
                  key={victim.id} 
                  className="glass-panel victim-card"
                  style={{ 
                    display: 'flex', gap: '1rem', padding: '1rem', borderRadius: '8px', 
                    position: 'relative', cursor: 'pointer', transition: 'all 0.2s ease'
                  }}
                  onClick={() => handleInspectVictim(victim)}
                >
                  {isNew && <div className="unread-indicator" title="New Casualty Intel"></div>}
                  
                  <div 
                    style={{ 
                      width: '80px', height: '80px', borderRadius: '4px', 
                      backgroundImage: `url(${victim.img_url || '/placeholder-mugshot.jpg'})`, 
                      backgroundSize: 'cover', backgroundPosition: 'center', 
                      flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' 
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontFamily: 'var(--font-primary)', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                      {victim.name}
                    </h4>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-crimson)', marginBottom: '0.5rem' }}>
                      VIC-{victim.id.toString().padStart(4, '0')}
                    </span>
                    {victim.background && (
                      <p style={{ 
                        margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', 
                        lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 3, 
                        WebkitBoxOrient: 'vertical', overflow: 'hidden' 
                      }}>
                        {victim.background}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <VictimModal 
        victim={inspectedVictim} 
        onClose={() => setInspectedVictim(null)} 
      />
    </div>
  );
}