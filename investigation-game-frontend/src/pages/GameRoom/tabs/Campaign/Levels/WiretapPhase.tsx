import React from 'react';
import { useRoomContext } from '@/context/RoomContext';
import type { Level, Choice, Question } from '@/types';
import './WiretapPhase.css';

interface WiretapPhaseProps {
  level: Level;
  status: string;
  localVotes: Record<number, number>;
  totalPlayers: number;
  getQuestionConsensus: (question: Question) => { votesCast: number, isResolved: boolean, isTie: boolean, winningChoiceId: number | null };
  handleSelectChoice: (e: React.MouseEvent, questionId: number, choice: Choice, status: string) => void;
  isHost: boolean;
  playedWiretaps: Set<number>;
  onPlayWiretap: (questionId: number, audioUrl: string) => void;
  isTriggeringWiretap: boolean;
}

export default function WiretapPhase({ 
  level, status, localVotes, totalPlayers, getQuestionConsensus, handleSelectChoice,
  isHost, playedWiretaps, onPlayWiretap, isTriggeringWiretap
}: WiretapPhaseProps) {
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

  if (!level.questions || level.questions.length === 0) return null;

  // --- THE NODE TRAVERSAL ENGINE ---
  const visibleQuestions: Question[] = [];
  let currentId: number | null = level.questions[0].id; // Root Node

  while (currentId) {
    const q = level.questions.find(x => x.id === currentId);
    if (!q) break;
    visibleQuestions.push(q);
    
    const consensus = getQuestionConsensus(q);
    if (consensus.isResolved && consensus.winningChoiceId) {
      const winningChoice = q.choices?.find(c => c.id === consensus.winningChoiceId);
      
      // If outcomes dictate a branch, follow it. Otherwise, fall back to linear progression.
      if (winningChoice?.outcomes?.next_question_id) {
        currentId = winningChoice.outcomes.next_question_id;
      } else {
        const currentIndex = level.questions.findIndex(x => x.id === q.id);
        currentId = level.questions[currentIndex + 1]?.id || null;
      }
    } else {
      currentId = null; // Traversal stops, awaiting player consensus
    }
  }

  return (
    <div className="wiretap-phase-wrapper">
      <h4 className="drawer-title" style={{ color: 'var(--accent-cyan)', margin: '0 0 1rem 0', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
        [ Active Intercept ]
      </h4>
      
      <div className="questions-list">
        {visibleQuestions.map((q, qIdx) => {
          
          const consensus = getQuestionConsensus(q);
          const prevConsensus = qIdx > 0 ? getQuestionConsensus(visibleQuestions[qIdx - 1]) : null;
          
          const isVisible = status === 'completed' || qIdx === 0 || (prevConsensus && prevConsensus.isResolved);
          if (!isVisible) return null;

          const isLocked = consensus.isResolved; 
          const hasLocalVote = !!localVotes[q.id];
          const hasBeenPlayed = playedWiretaps.has(q.id);
          const isAudioIntercept = !!q.audio_url;
          
          // Pad the number for a more tactical feel (e.g. 01, 02)
          const interceptNumber = String(qIdx + 1).padStart(2, '0');

          return (
            <div key={q.id} className="question-item wiretap-item">
              
              {/* Tactical Sidebar */}
              <div className="wiretap-sidebar">
                <span className="question-number">INT-{interceptNumber}</span>
                {isAudioIntercept && !hasBeenPlayed && (
                  <span className="tactical-pulse">🎙️</span>
                )}
                {isAudioIntercept && hasBeenPlayed && (
                  <span style={{ fontSize: '1.2rem', marginTop: '0.75rem', opacity: 0.5 }}>🔇</span>
                )}
              </div>

              {/* Main Content Body */}
              <div className="question-body" style={{ width: '100%' }}>
                <p className="question-text" style={{ marginTop: 0 }}>
                  {q.text}
                  {status === 'active' && !isLocked && (
                    <span style={{ display: 'block', fontSize: '0.75rem', color: consensus.isTie ? 'var(--accent-crimson)' : 'var(--text-secondary)', marginTop: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                      {consensus.isTie 
                          ? '> ⚠️ TIE DETECTED: CHANGE VOTE TO RESOLVE' 
                          : hasLocalVote 
                            ? `> STATUS: Vote recorded [${consensus.votesCast}/${totalPlayers}]` 
                            : `> STATUS: Awaiting Agent consensus [${consensus.votesCast}/${totalPlayers}]`
                        }
                    </span>
                  )}
                </p>

                {isAudioIntercept && (
                  <div className={`wiretap-container ${hasBeenPlayed ? 'played' : ''}`}>
                    {hasBeenPlayed ? (
                      <div className="wiretap-burned">
                        <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>🔒</span> 
                        CONNECTION SEVERED. RELY ON FIELD NOTES.
                      </div>
                    ) : (
                      <button 
                        className="btn-primary play-wiretap-btn"
                        disabled={!isHost || isTriggeringWiretap}
                        onClick={(e) => { e.stopPropagation(); onPlayWiretap(q.id, q.audio_url!); }}
                      >
                        {isHost ? '▶ INITIATE AUDIO FEED (ONCE)' : 'AWAITING HOST TO INITIATE'}
                      </button>
                    )}
                  </div>
                )}

                <div className="choices-preview" style={{ marginTop: '1rem' }}>
                  {q.choices?.map(c => {
                    const isSelected = localVotes[q.id] === c.id;
                    const isHistoricalCorrect = status === 'completed' && !c.outcomes?.gives_strike;
                    const isNarrativeLocked = checkIsLockedByNarrative(c);
                    
                    let pillClass = 'choice-pill';
                    if (isNarrativeLocked) {
                      pillClass = 'choice-pill locked-choice';
                    } else {
                      if (isSelected) pillClass += ' selected';
                      if (isHistoricalCorrect) pillClass += ' historical-correct';
                      if (status === 'active' && !isLocked && (!isAudioIntercept || hasBeenPlayed)) pillClass += ' interactable';
                    }

                    const preventGuessing = (isAudioIntercept && !hasBeenPlayed) || isNarrativeLocked;

                    return (
                      <span 
                        key={c.id} 
                        className={pillClass}
                        onClick={(e) => {
                          if (status === 'active' && !isLocked && !preventGuessing) handleSelectChoice(e, q.id, c, status);
                        }}
                      >
                        {isNarrativeLocked 
                          ? '🔒 [ PATH LOCKED: PREREQUISITES NOT MET ]' 
                          : (isAudioIntercept && !hasBeenPlayed) 
                            ? '[ CLASSIFIED ]' 
                            : c.text
                        }
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}