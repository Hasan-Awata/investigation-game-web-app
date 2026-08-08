import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRoomContext } from '@/context/RoomContext';
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
  const { room } = useRoomContext();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [popup, setPopup] = useState<{ title: string; message: string; isSuccess: boolean } | null>(null);
  
  // 1. Scoped keys for both dead ends and found intel. 
  // Tying it to room.id ensures it never bleeds into new cases and is wiped by our Garbage Collector.
  const deadEndsStorageKey = `room_${room.id}_level_${level.id}_dead_ends`;
  const foundPointsStorageKey = `room_${room.id}_level_${level.id}_found_points`;
  
  const [clickedDeadEnds, setClickedDeadEnds] = useState<Set<number>>(() => {
    try {
      const saved = sessionStorage.getItem(deadEndsStorageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  // 2. Track found intel locally so multiple points per question can be remembered without overwriting the single vote
  const [foundPoints, setFoundPoints] = useState<Set<number>>(() => {
    try {
      const saved = sessionStorage.getItem(foundPointsStorageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

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
    
    if (status !== 'active') return;

    const isCorrectFind = choice.is_correct || !!(choice.unlocks_evidence_id || choice.unlocks_level_id || choice.unlocks_suspect_id || choice.unlocks_victim_id);

    if (isCorrectFind) {
      setPopup({
        title: "LEAD DISCOVERED",
        message: "I found something useful here. Logging it to the board.",
        isSuccess: true
      });
      
      // 3. Save to our new local found points cache
      setFoundPoints(prev => {
        const newSet = new Set(prev).add(choice.id);
        sessionStorage.setItem(foundPointsStorageKey, JSON.stringify(Array.from(newSet)));
        return newSet;
      });

      if (!localVotes[qId]) {
        handleSelectChoice(e, qId, choice, status);
      }
    } else {
        setPopup({
          title: "DEAD END",
          message: "Nothing was found here. I should keep looking.",
          isSuccess: false
        });
        
        setClickedDeadEnds(prev => {
          const newSet = new Set(prev).add(choice.id);
          sessionStorage.setItem(deadEndsStorageKey, JSON.stringify(Array.from(newSet)));
          return newSet;
        });
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

              // 4. Update the selection logic to honor the new found points cache alongside DB votes
              const isSelected = localVotes[q.id] === choice.id || foundPoints.has(choice.id) || (isCompleted && choice.is_correct);
              const isDeadEndClicked = clickedDeadEnds.has(choice.id);

              let zoneClass = 'loc-hover-zone';
              if (isSelected) {
                zoneClass += ' selected'; 
              } else if (isCompleted || isDeadEndClicked) {
                zoneClass += ' investigated'; 
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
              <span style={{ marginRight: '0.5rem'}}>👁️</span> Inspect Location
            </button>
          </div>
        </div>
        <p className="location-hint">Enter the full-screen viewer to sweep the scene for evidence.</p>
      </div>

      {fullScreenViewer}
    </div>
  );
}