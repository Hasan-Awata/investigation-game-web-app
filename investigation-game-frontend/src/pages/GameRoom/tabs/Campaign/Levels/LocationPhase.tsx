import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRoomState } from '@/context/RoomContext';
import { useInvestigationPhase } from '@/hooks/useInvestigationPhase';
import type { Level, Choice } from '@/types';
import './LocationPhase.css';

interface LocationPhaseProps {
  level: Level;
  status: string;
  isHost: boolean;
  isSubmitting: boolean;
  handleSubmitTheory: (e: React.MouseEvent) => void;
}

export default function LocationPhase({ level, status, isHost, isSubmitting, handleSubmitTheory }: LocationPhaseProps) {
  const { room, accumulatedEvidences } = useRoomState();
  const { localVotes, handleSelectChoice, addToast } = useInvestigationPhase();

  const storedUser = localStorage.getItem('auth_user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const currentUserId = currentUser?.id;
  
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

  const [inspectingQuestionId, setInspectingQuestionId] = useState<number | null>(null);
  const [popup, setPopup] = useState<{ title: string; message: string; isSuccess: boolean } | null>(null);
  
  const popupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    return () => {
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    };
  }, []);
  
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

  // --- NEW: P2P State Synchronization ---
  const stateRef = useRef({ deadEnds: clickedDeadEnds, found: foundPoints });
  useEffect(() => {
    stateRef.current = { deadEnds: clickedDeadEnds, found: foundPoints };
  }, [clickedDeadEnds, foundPoints]);

  useEffect(() => {
    if (!window.Echo) return;
    const channel = window.Echo.private(`room.${room.id}`);

    // 1. Listen for real-time clicks from other agents
    channel.listenForWhisper('location-interacted', (e: { type: string, choiceId: number }) => {
      if (e.type === 'deadEnd') {
        setClickedDeadEnds(prev => {
          const next = new Set(prev).add(e.choiceId);
          sessionStorage.setItem(deadEndsStorageKey, JSON.stringify(Array.from(next)));
          return next;
        });
      } else if (e.type === 'foundPoint') {
        setFoundPoints(prev => {
          const next = new Set(prev).add(e.choiceId);
          sessionStorage.setItem(foundPointsStorageKey, JSON.stringify(Array.from(next)));
          return next;
        });
      }
    });

    // 2. Listen for late-joiners requesting the current board state
    channel.listenForWhisper('request-location-sync', () => {
      const { deadEnds, found } = stateRef.current;
      if (deadEnds.size > 0 || found.size > 0) {
        channel.whisper('location-sync-reply', {
          deadEnds: Array.from(deadEnds),
          foundPoints: Array.from(found)
        });
      }
    });

    // 3. Receive the sync data if we were the late-joiner
    channel.listenForWhisper('location-sync-reply', (e: { deadEnds: number[], foundPoints: number[] }) => {
      if (e.deadEnds?.length) {
        setClickedDeadEnds(prev => {
          const next = new Set([...prev, ...e.deadEnds]);
          sessionStorage.setItem(deadEndsStorageKey, JSON.stringify(Array.from(next)));
          return next;
        });
      }
      if (e.foundPoints?.length) {
        setFoundPoints(prev => {
          const next = new Set([...prev, ...e.foundPoints]);
          sessionStorage.setItem(foundPointsStorageKey, JSON.stringify(Array.from(next)));
          return next;
        });
      }
    });

    // 4. Trigger the sync request 1 second after mount to ensure connections are stable
    const syncTimer = setTimeout(() => {
      channel.whisper('request-location-sync', {});
    }, 1000);

    return () => clearTimeout(syncTimer);
  }, [room.id, deadEndsStorageKey, foundPointsStorageKey]);
  // ----------------------------------------

  if (!level.questions) return null;

  const isCompleted = status === 'completed';
  const visibleQuestionIds = new Set<number>();
  
  // 1. Map out all scenes that are intentionally locked behind a coordinate click
  const lockedBehindChoiceIds = new Set<number>();
  level.questions.forEach(q => {
    q.choices?.forEach(c => {
      if (c.outcomes?.next_question_id) {
        lockedBehindChoiceIds.add(Number(c.outcomes.next_question_id));
      }
    });
  });

  // 2. Any scene NOT explicitly locked behind a choice is an independent scene. Make it visible.
  level.questions.forEach(q => {
    if (!lockedBehindChoiceIds.has(q.id)) {
      visibleQuestionIds.add(q.id);
    }
  });

  // 3. Add dynamically unlocked scenes based on player interactions
  level.questions.forEach(q => {
    q.choices?.forEach(c => {
      const isSelectedLocally = foundPoints.has(c.id) || localVotes[q.id] === c.id;
      const isSelectedGlobally = room.votes?.some(v => v.choice_id === c.id);

      if (isSelectedLocally || isSelectedGlobally) {
        if (c.outcomes?.next_question_id) {
          visibleQuestionIds.add(Number(c.outcomes.next_question_id));
        }
      }
    });
  });

  const displayQuestions = isCompleted 
    ? level.questions 
    : level.questions.filter(q => 
        visibleQuestionIds.has(q.id) &&
        (q.assigned_user_id === currentUserId || 
         q.assigned_user_id === undefined || 
         q.assigned_user_id === null)
      );

  const handlePointClick = (e: React.MouseEvent, qId: number, choice: Choice) => {
    e.stopPropagation();
    if (status !== 'active') return;

    if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);

    const hasUnlocks = choice.outcomes && (
      (choice.outcomes.unlock_evidence && choice.outcomes.unlock_evidence.length > 0) || 
      (choice.outcomes.unlock_levels && choice.outcomes.unlock_levels.length > 0) || 
      (choice.outcomes.unlock_suspects && choice.outcomes.unlock_suspects.length > 0) ||
      (choice.outcomes.unlock_victims && choice.outcomes.unlock_victims.length > 0) ||
      (choice.outcomes.next_question_id) 
    );

    const isCorrectFind = !!hasUnlocks;
    const isFirstTimeDiscovery = !foundPoints.has(choice.id);

    if (isCorrectFind) {
      setPopup({
        title: "LEAD DISCOVERED",
        message: choice.outcomes?.feedback || "I found something useful here. Logging it to the board.",
        isSuccess: true
      });
      
      if (isFirstTimeDiscovery && choice.outcomes?.next_question_id) {
        addToast({
          type: 'level', 
          title: 'NEW SCENE UNLOCKED',
          message: 'A new vantage point or room has been discovered.',
          icon: 'https://api.iconify.design/ph:map-pin-line-duotone.svg?color=%235a8a9e' 
        });
      }

      setFoundPoints(prev => {
        const newSet = new Set(prev).add(choice.id);
        sessionStorage.setItem(foundPointsStorageKey, JSON.stringify(Array.from(newSet)));
        return newSet;
      });

      // Broadcast correct find
      window.Echo?.private(`room.${room.id}`).whisper('location-interacted', { type: 'foundPoint', choiceId: choice.id });

      if (isFirstTimeDiscovery) {
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

        // Broadcast dead end
        window.Echo?.private(`room.${room.id}`).whisper('location-interacted', { type: 'deadEnd', choiceId: choice.id });
      }

    popupTimeoutRef.current = setTimeout(() => {
      setPopup(null);
    }, 2500);
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
              (choice.outcomes.unlock_victims && choice.outcomes.unlock_victims.length > 0) ||
              (choice.outcomes.next_question_id)
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

  // Evaluate if any interaction has occurred globally or via our synced local state
  const hasGlobalInteraction = level.questions?.some(q => room.votes?.some((v: any) => v.question_id === q.id));
  const hasInteracted = foundPoints.size > 0 || clickedDeadEnds.size > 0 || hasGlobalInteraction;

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

      {/* Conditional Leave Location Button */}
      {status === 'active' && (
        <div style={{ gridColumn: '1 / -1', marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
          {isHost ? (
            <button
              className="btn-primary"
              disabled={!hasInteracted || isSubmitting}
              onClick={handleSubmitTheory}
              style={{ padding: '1rem 3rem', width: 'auto' }}
            >
              {isSubmitting ? 'Processing...' : 'Leave Location'}
            </button>
          ) : (
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '4px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', width: '100%', textAlign: 'center' }}>
              Sweep in progress. Awaiting Host to conclude the search...
            </div>
          )}
        </div>
      )}

      {fullScreenViewer}
    </div>
  );
}