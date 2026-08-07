import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Level, Choice } from '@/types';
import './LocationPhase.css';

interface LocationPhaseProps {
  level: Level;
  status: string;
  localVotes: Record<number, number>;
  handleSelectChoice: (e: React.MouseEvent, questionId: number, choice: Choice, status: string) => void;
  currentUserId: number;
}

export default function LocationPhase({ level, status, localVotes, handleSelectChoice, currentUserId }: LocationPhaseProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [popup, setPopup] = useState<{ title: string; message: string; isSuccess: boolean } | null>(null);

  if (!level.questions || !level.img_url) return null;

  const isCompleted = status === 'completed';
  
  // FALLBACK: If the backend fails to send 'assigned_user_id', show the point to everyone rather than hiding it.
  const displayQuestions = isCompleted 
    ? level.questions 
    : level.questions.filter(q => 
        q.assigned_user_id === currentUserId || 
        q.assigned_user_id === undefined || 
        q.assigned_user_id === null
      );

  const handlePointClick = (e: React.MouseEvent, qId: number, choice: Choice, isInvestigated: boolean) => {
    e.stopPropagation();
    if (isInvestigated || status !== 'active') return;

    const hasUnlock = !!(choice.unlocks_evidence_id || choice.unlocks_level_id || choice.unlocks_suspect_id || choice.unlocks_victim_id);

    if (hasUnlock) {
      setPopup({
        title: "LEAD DISCOVERED",
        message: "I found something useful here. Logging it to the board.",
        isSuccess: true
      });
    } else {
      setPopup({
        title: "DEAD END",
        message: "Nothing was found here, I will move on.",
        isSuccess: false
      });
    }

    handleSelectChoice(e, qId, choice, status);
    setTimeout(() => setPopup(null), 2500);
  };

  const fullScreenViewer = isFullscreen ? createPortal(
    <div className="location-fullscreen-overlay">
      <div className="location-header glass-panel">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 className="section-title" style={{ margin: 0, border: 'none', padding: 0 }}>{level.title}</h2>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Active Scene Sweep</span>
        </div>
        <button className="btn-secondary" style={{ flex: 'none', padding: '0.5rem 1.5rem' }} onClick={() => setIsFullscreen(false)}>
          Close Viewer
        </button>
      </div>

      <div className="location-image-container">
        
        {popup && (
          <div className={`loc-feedback-modal ${popup.isSuccess ? 'success' : 'error'}`}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: popup.isSuccess ? 'var(--accent-cyan)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
              {popup.title}
            </h3>
            <p style={{ margin: 0, color: 'var(--text-primary)' }}>{popup.message}</p>
          </div>
        )}

        <div className="location-image-wrapper">
          <img src={level.img_url} alt="Crime Scene" className="location-image-full" />

          {displayQuestions.map(q => {
            const choice = q.choices?.[0];
            if (!choice) return null;

            // BULLETPROOF PARSING: Splits strictly by the pipe character and trims spaces later
            const parts = choice.text.split('|');
            if (parts.length < 2) {
              console.warn(`[SYSTEM DIAGNOSTIC] Question ID ${q.id} is missing coordinate data. Expected format "X,Y | Title". Received: "${choice.text}"`);
              return null;
            }
            
            const coords = parts[0].trim();
            const title = parts[1].trim();
            
            const coordParts = coords.split(',');
            if (coordParts.length < 2) return null;

            const x = coordParts[0].trim();
            const y = coordParts[1].trim();

            const isInvestigated = !!localVotes[q.id] || isCompleted;

            return (
              <div
                key={q.id}
                className={`loc-hover-zone ${isInvestigated ? 'investigated' : ''}`}
                style={{ top: `${y}%`, left: `${x}%` }}
                onClick={(e) => handlePointClick(e, q.id, choice, isInvestigated)}
              >
                <div className="loc-crosshair"></div>
                <div className="loc-tooltip">{title}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="location-phase-wrapper">
      <div className="location-thumbnail-container">
        <div className="location-thumbnail" style={{ backgroundImage: `url(${level.img_url})` }}>
          <div className="thumbnail-overlay">
            <button 
              className="btn-primary" 
              onClick={() => setIsFullscreen(true)}
              style={{ 
                flex: 'none',          /* Kills the global stretching behavior */
                width: 'auto',         /* Forces the button to wrap its text */
                padding: '0.75rem 2rem', /* Tighter padding for a floating action button */
                borderRadius: '50px',  /* A pill shape looks much better floating over an image */
                boxShadow: '0 4px 15px rgba(0,0,0,0.5)' /* Drops a shadow to detach it from the image */
              }}
            >
              Inspect Location
            </button>
          </div>
        </div>
        <p className="location-hint">Enter the full-screen viewer to sweep the scene for evidence.</p>
      </div>

      {fullScreenViewer}
    </div>
  );
}