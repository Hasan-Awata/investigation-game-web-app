import React from 'react';
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
  onPlayWiretap: (questionId: number) => void;
  isTriggeringWiretap: boolean;
}

export default function WiretapPhase({ 
  level, status, localVotes, totalPlayers, getQuestionConsensus, handleSelectChoice,
  isHost, playedWiretaps, onPlayWiretap, isTriggeringWiretap
}: WiretapPhaseProps) {
  if (!level.questions) return null;

  return (
    <div className="wiretap-phase-wrapper">
      <h4 className="drawer-title" style={{ color: 'var(--accent-cyan)' }}>Active Intercept</h4>
      
      <div className="questions-list">
        {level.questions.map((q, qIdx) => {
          
          const consensus = getQuestionConsensus(q);
          const prevConsensus = qIdx > 0 ? getQuestionConsensus(level.questions![qIdx - 1]) : null;
          
          const isVisible = status === 'completed' || qIdx === 0 || (prevConsensus && prevConsensus.isResolved);
          if (!isVisible) return null;

          const isLocked = consensus.isResolved; 
          const hasLocalVote = !!localVotes[q.id];
          const hasBeenPlayed = playedWiretaps.has(q.id);
          const isAudioIntercept = !!q.audio_url;

          return (
            <div key={q.id} className="question-item wiretap-item">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span className="question-number">INT-{qIdx + 1}</span>
                {isAudioIntercept && <span className="pulse-icon" style={{ color: 'var(--accent-cyan)', marginTop: '0.5rem' }}>🎙️</span>}
              </div>

              <div className="question-body" style={{ width: '100%' }}>
                <p className="question-text">
                  {q.text}
                  {status === 'active' && !isLocked && (
                    <span style={{ display: 'block', fontSize: '0.75rem', color: consensus.isTie ? 'var(--accent-crimson)' : 'var(--text-secondary)', marginTop: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                      ↳ {consensus.isTie 
                          ? '⚠️ TIE DETECTED: CHANGE VOTE TO RESOLVE' 
                          : hasLocalVote 
                            ? `Vote recorded (${consensus.votesCast} / ${totalPlayers}).` 
                            : `Awaiting Agent consensus: ${consensus.votesCast} / ${totalPlayers} cast`
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
                        onClick={(e) => { e.stopPropagation(); onPlayWiretap(q.id); }}
                      >
                        {isHost ? '▶ INITIATE AUDIO FEED (ONCE)' : 'AWAITING HOST TO INITIATE FEED'}
                      </button>
                    )}
                  </div>
                )}

                <div className="choices-preview">
                  {q.choices?.map(c => {
                    const isSelected = localVotes[q.id] === c.id;
                    const isHistoricalCorrect = status === 'completed' && c.is_correct;
                    
                    let pillClass = 'choice-pill';
                    if (isSelected) pillClass += ' selected';
                    if (isHistoricalCorrect) pillClass += ' historical-correct';
                    if (status === 'active' && !isLocked && (!isAudioIntercept || hasBeenPlayed)) pillClass += ' interactable';

                    // Lock choices if it's an audio question that hasn't been played yet
                    const preventGuessing = isAudioIntercept && !hasBeenPlayed;

                    return (
                      <span 
                        key={c.id} 
                        className={preventGuessing ? 'choice-pill locked-choice' : pillClass}
                        onClick={(e) => {
                          if (status === 'active' && !isLocked && !preventGuessing) handleSelectChoice(e, q.id, c, status);
                        }}
                      >
                        {preventGuessing ? 'CLASSIFIED (Awaiting Audio)' : c.text}
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