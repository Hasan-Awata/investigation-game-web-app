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
  const { room, accumulatedEvidences } = useRoomContext();
  
  const checkIsLockedByNarrative = (choice: Choice) => {
    if (!choice.requirements) return false;
    const reqs = choice.requirements;

    if (reqs.required_evidence?.length > 0) {
      const hasAllEvidence = reqs.required_evidence.every((id: number) => 
        accumulatedEvidences.some(e => e.id === id)
      );
      if (!hasAllEvidence) return true;
    }

    if (reqs.required_choices?.length > 0) {
      const hasAllChoices = reqs.required_choices.every((id: number) => 
        room.votes?.some(v => v.choice_id === id)
      );
      if (!hasAllChoices) return true;
    }

    return false;
  };

  // Track WHICH question (angle) is currently fullscreen
  const [inspectingQuestionId, setInspectingQuestionId] = useState<number | null>(null);
  const [popup, setPopup] = useState<{ title: string; message: string; isSuccess: boolean } | null>(null);
  
  const deadEndsStorageKey = `room_${room.id}_level_${level.id}_dead_ends`;
  const foundPointsStorageKey = `room_${room.id}_level_${level.id}_found_points`;
  
  const [clickedDeadEnds, setClickedDeadEnds] = useState<Set<number>>(() => {
    try {
      const saved = sessionStorage.getItem(deadEndsStorageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const [foundPoints, setFoundPoints] = useState<Set<number>>(() => {
    try {
      const saved = sessionStorage.getItem(foundPointsStorageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  // Removed the level.img_url check so it doesn't fail if the parent level lacks an image
  if (!level.questions) return null;

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

    const hasUnlocks = choice.outcomes && (
      (choice.outcomes.unlock_evidence && choice.outcomes.unlock_evidence.length > 0) || 
      (choice.outcomes.unlock_levels && choice.outcomes.unlock_levels.length > 0) || 
      (choice.outcomes.unlock_suspects && choice.outcomes.unlock_suspects.length > 0) ||
      (choice.outcomes.unlock_victims && choice.outcomes.unlock_victims.length > 0)
    );

    const isCorrectFind = !!hasUnlocks;

    if (isCorrectFind) {
      setPopup({
        title: "LEAD DISCOVERED",
        message: choice.outcomes?.feedback || "I found something useful here. Logging it to the board.",
        isSuccess: true
      });
      
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
          message: choice.outcomes?.feedback || "Nothing was found here. I should keep looking.",
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

  const activeQuestion = displayQuestions.find(q => q.id === inspectingQuestionId);

  const fullScreenViewer = activeQuestion ? createPortal(
    <div className="location-fullscreen-overlay">
      <div className="location-header glass-panel">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 className="section-title" style={{ margin: 0, border: 'none', padding: 0 }}>
            {activeQuestion.text || level.title}
          </h2>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Active Scene Sweep</span>
        </div>
        <button className="btn-secondary" style={{ flex: 'none', padding: '0.5rem 1.5rem' }} onClick={() => setInspectingQuestionId(null)}>
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
          <img src={activeQuestion.img_url || '/placeholder-crime-scene.jpg'} alt="Crime Scene" className="location-image-full" />

          {activeQuestion.choices?.map(choice => {
            const parts = choice.text.split('|');
            if (parts.length < 2) return null;
            
            const coords = parts[0].trim();
            const title = parts[1].trim();
            
            const coordParts = coords.split(',');
            if (coordParts.length < 2) return null;

            const x = coordParts[0].trim();
            const y = coordParts[1].trim();

            const hasUnlocks = choice.outcomes && (
              (choice.outcomes.unlock_evidence && choice.outcomes.unlock_evidence.length > 0) || 
              (choice.outcomes.unlock_levels && choice.outcomes.unlock_levels.length > 0) || 
              (choice.outcomes.unlock_suspects && choice.outcomes.unlock_suspects.length > 0) ||
              (choice.outcomes.unlock_victims && choice.outcomes.unlock_victims.length > 0)
            );

            const isSelected = localVotes[activeQuestion.id] === choice.id || foundPoints.has(choice.id) || (isCompleted && !!hasUnlocks);
            const isDeadEndClicked = clickedDeadEnds.has(choice.id);
            const isNarrativeLocked = checkIsLockedByNarrative(choice);

            let zoneClass = 'loc-hover-zone';
            if (isSelected) {
              zoneClass += ' selected'; 
            } else if (isCompleted || isDeadEndClicked || isNarrativeLocked) {
              zoneClass += ' investigated'; 
            }

            return (
              <div
                key={choice.id}
                className={zoneClass}
                style={{ top: `${y}%`, left: `${x}%`, cursor: isNarrativeLocked ? 'not-allowed' : 'crosshair' }}
                onClick={(e) => {
                  if (isNarrativeLocked) return;
                  handlePointClick(e, activeQuestion.id, choice);
                }}
              >
                <div className="loc-crosshair"></div>
                <div className="loc-tooltip">
                  {isNarrativeLocked ? '🔒 [ REQUIRES ADDITIONAL INTEL ]' : title}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="location-phase-wrapper" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
      {displayQuestions.map(q => (
        <div key={q.id} className="location-thumbnail-container">
          <div className="location-thumbnail" style={{ backgroundImage: `url(${q.img_url || '/placeholder-crime-scene.jpg'})` }}>
            <div className="thumbnail-overlay">
              <button 
                className="btn-primary" 
                onClick={() => setInspectingQuestionId(q.id)}
                style={{ flex: 'none', width: 'auto', padding: '0.75rem 2rem', borderRadius: '50px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}
              >
                <span style={{ marginRight: '0.5rem'}}>👁️</span> Inspect Location
              </button>
            </div>
          </div>
          <p className="location-hint">{q.text || 'Enter the full-screen viewer to sweep the scene.'}</p>
        </div>
      ))}

      {fullScreenViewer}
    </div>
  );
}