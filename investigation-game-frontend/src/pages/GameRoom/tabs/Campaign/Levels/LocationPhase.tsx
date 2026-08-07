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
  
  const displayQuestions = isCompleted 
    ? level.questions 
    : level.questions.filter(q => 
        q.assigned_user_id === currentUserId || 
        q.assigned_user_id === undefined || 
        q.assigned_user_id === null
      );

  const handlePointClick = (e: React.MouseEvent, qId: number, choice: Choice) => {
    e.stopPropagation();
    
    // 1. If phase is over, or they already locked in the correct choice, block further clicks.
    if (status !== 'active' || localVotes[qId]) return;

    // 2. Did they find the actual clue?
    const isCorrectFind = choice.is_correct || !!(choice.unlocks_evidence_id || choice.unlocks_level_id || choice.unlocks_suspect_id || choice.unlocks_victim_id);

    if (isCorrectFind) {
      setPopup({
        title: "LEAD DISCOVERED",
        message: "I found something useful here. Logging it to the board.",
        isSuccess: true
      });
      // ONLY lock the choice and send to backend if it's the correct find
      handleSelectChoice(e, qId, choice, status);
    } else {
      setPopup({
        title: "DEAD END",
        message: "Nothing was found here. I should keep looking.",
        isSuccess: false
      });
      // DO NOT call handleSelectChoice. They aren't penalized and can keep clicking!
    }

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

          {displayQuestions.flatMap(q => {
            return q.choices?.map(choice => {
              
              const parts = choice.text.split('|');
              if (parts.length < 2) return null;
              
              const coords = parts[0].trim();
              const title = parts[1].trim();
              
              const coordParts = coords.split(',');
              if (coordParts.length < 2) return null;

              const x = coordParts[0].trim();
              const y = coordParts[1].trim();

              const hasVotedLocally = !!localVotes[q.id];
              // Highlight the point if they just clicked it, OR if the phase is completed and this was the historical correct answer
              const isSelected = localVotes[q.id] === choice.id || (isCompleted && choice.is_correct);

              let zoneClass = 'loc-hover-zone';
              if (isSelected) {
                zoneClass += ' selected'; // Applies the fixed cyan layout from your screenshot
              } else if (isCompleted || hasVotedLocally) {
                zoneClass += ' investigated'; // Turns unselected dead-ends grey once the clue is found
              }

              return (
                <div
                  key={choice.id}
                  className={zoneClass}
                  style={{ top: `${y}%`, left: `${x}%` }}
                  onClick={(e) => handlePointClick(e, q.id, choice)}
                >
                  <div className="loc-crosshair"></div>
                  <div className="loc-tooltip">{title}</div>
                </div>
              );
            });
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
              style={{ flex: 'none', width: 'auto', padding: '0.75rem 2rem', borderRadius: '50px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}
            >
              <span style={{ marginRight: '0.5rem', filter: 'brightness(0)' }}>👁️</span> Inspect Crime Scene
            </button>
          </div>
        </div>
        <p className="location-hint">Enter the full-screen viewer to sweep the scene for evidence.</p>
      </div>

      {fullScreenViewer}
    </div>
  );
}