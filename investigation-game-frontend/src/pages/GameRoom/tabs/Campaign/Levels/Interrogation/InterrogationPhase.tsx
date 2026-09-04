import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomState } from '@/context/RoomContext';
import { useInvestigationPhase } from '@/hooks/useInvestigationPhase';
import type { Level, Choice, Question } from '@/types';
import './InterrogationPhase.css';

// --- MESSAGE REVEAL COMPONENT ---
const MessageReveal = ({ text, onComplete, skip = false, cacheKey = '' }: { text: string, delay?: number, onComplete?: () => void, skip?: boolean, cacheKey?: string }) => {
  const [isTyping, setIsTyping] = useState(!skip && !(cacheKey && sessionStorage.getItem(cacheKey)));
  const savedOnComplete = useRef(onComplete);

  useEffect(() => {
    savedOnComplete.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!text) {
      if (savedOnComplete.current) savedOnComplete.current();
      return;
    }

    if (!isTyping) {
      if (savedOnComplete.current) savedOnComplete.current();
      return;
    }

    // Dynamic delay based on text length (min 800ms, max 2500ms) for realism
    const calculatedDelay = Math.min(Math.max(text.length * 15, 800), 2500);

    const timer = setTimeout(() => {
      setIsTyping(false);
      if (cacheKey) sessionStorage.setItem(cacheKey, 'true');
    }, calculatedDelay);

    return () => clearTimeout(timer);
  }, [isTyping, text, cacheKey]);

  if (isTyping) {
    return (
      <span className="typing-indicator">
        <span></span><span></span><span></span>
      </span>
    );
  }

  return <span className="fade-in-text">{text}</span>;
};

interface InterrogationPhaseProps {
  level: Level;
  status: string;
  totalPlayers: number;
  getQuestionConsensus: (question: Question) => { votesCast: number, isResolved: boolean, isTie: boolean, winningChoiceId: number | null };
  isHost: boolean;
  isSubmitting: boolean;
  handleSubmitTheory: (e?: React.MouseEvent) => void; 
}

export default function InterrogationPhase({
  level, status, totalPlayers, getQuestionConsensus, isHost, isSubmitting, handleSubmitTheory
}: InterrogationPhaseProps) {
  const { t } = useTranslation();
  const { room, accumulatedEvidences } = useRoomState();
  const { localVotes, handleSelectChoice } = useInvestigationPhase();

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

  const [suspectTypingComplete, setSuspectTypingComplete] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    level.questions?.forEach(q => {
      if (sessionStorage.getItem(`room_${room.id}_suspect_${q.id}`)) initial[q.id] = true;
    });
    return initial;
  });

  const [investigatorTypingComplete, setInvestigatorTypingComplete] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    level.questions?.forEach(q => {
      if (sessionStorage.getItem(`room_${room.id}_investigator_${q.id}`)) initial[q.id] = true;
    });
    return initial;
  });

  const { visibleQuestions, consensusMap } = useMemo(() => {
    const questions: Question[] = [];
    const map: Record<number, ReturnType<typeof getQuestionConsensus>> = {};

    if (!level.questions || level.questions.length === 0) {
      return { visibleQuestions: questions, consensusMap: map };
    }

    let currentId: number | null = level.questions[0].id;

    while (currentId) {
      const q = level.questions.find(x => x.id === currentId);
      if (!q) break;
      questions.push(q);

      const consensus = getQuestionConsensus(q);
      map[q.id] = consensus;

      if (consensus.isResolved && consensus.winningChoiceId) {
        const winningChoice = q.choices?.find(c => c.id === consensus.winningChoiceId);

        if (winningChoice?.outcomes?.next_question_id) {
          currentId = Number(winningChoice.outcomes.next_question_id);
        } else {
          currentId = null;
        }
      } else {
        currentId = null;
      }
    }
    return { visibleQuestions: questions, consensusMap: map };
  }, [level.questions, room.votes, getQuestionConsensus]);

  const handleSuspectDone = (qId: number) => setSuspectTypingComplete(prev => ({ ...prev, [qId]: true }));
  const handleInvestigatorDone = (qId: number) => setInvestigatorTypingComplete(prev => ({ ...prev, [qId]: true }));

  const lastQuestion = visibleQuestions[visibleQuestions.length - 1];
  const hasNoChoices = !lastQuestion?.choices || lastQuestion.choices.length === 0;

  const lastConsensus = lastQuestion ? consensusMap[lastQuestion.id] : null;
  const finalWinningChoice = lastConsensus?.winningChoiceId
    ? lastQuestion.choices?.find(c => c.id === lastConsensus.winningChoiceId)
    : null;
  const isPlayerTerminal = lastConsensus?.isResolved && finalWinningChoice && !finalWinningChoice?.outcomes?.next_question_id;

  const isTerminalNode = hasNoChoices || isPlayerTerminal;

  const isReadyToSubmit = lastQuestion && (
    hasNoChoices
      ? (suspectTypingComplete[lastQuestion.id] || status === 'completed')
      : (investigatorTypingComplete[lastQuestion.id] || status === 'completed')
  );

  // 1. ADD THIS: A strict local lock to prevent double-firing
  const hasAutoSubmitted = useRef(false);

  // 2. ADD THIS: Reset the lock if the level status safely changes
  useEffect(() => {
    if (status !== 'active') {
      hasAutoSubmitted.current = false;
    }
  }, [status]);

  // 3. UPDATE THIS: Add the ref check to your existing trigger
  useEffect(() => {
    if (status === 'active' && isTerminalNode && isReadyToSubmit && isHost && !isSubmitting && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true; // Lock it immediately
      handleSubmitTheory();
    }
  }, [status, isTerminalNode, isReadyToSubmit, isHost, isSubmitting, handleSubmitTheory]);

  if (visibleQuestions.length === 0) return null;

  return (
    <div className="interrogation-log">
      {visibleQuestions.map((q, qIdx) => {
        const consensus = consensusMap[q.id];
        const prevQ = qIdx > 0 ? visibleQuestions[qIdx - 1] : null;
        const isVisible = status === 'completed' || qIdx === 0 || (prevQ && investigatorTypingComplete[prevQ.id]);

        if (!isVisible) return null;

        const isGloballyLocked = consensus.isResolved;
        const skipTyping = status === 'completed';
        const isSuspectDone = suspectTypingComplete[q.id] || skipTyping;
        const hasLocalVote = !!localVotes[q.id];

        const winningChoice = q.choices?.find(c => c.id === consensus.winningChoiceId);
        const customReaction = winningChoice?.outcomes?.suspect_reaction;

        return (
          <div key={q.id} className="chat-exchange">

            <div className="chat-bubble suspect-bubble">
              <span className="speaker-label suspect">
                {t('pages.gameRoom.campaign.levels.interrogation.suspect')} {customReaction ? `[${customReaction}]` : ''}
              </span>
              <p>
                <MessageReveal
                  text={q.text}
                  skip={skipTyping}
                  cacheKey={`room_${room.id}_suspect_${q.id}`}
                  onComplete={() => handleSuspectDone(q.id)}
                />
              </p>
            </div>

            {isSuspectDone && q.choices && q.choices.length > 0 && (
              <>
                {status === 'active' && !isGloballyLocked && (
                  <div className="investigator-interaction-area">
                    <div className={`vote-status-box ${hasLocalVote ? 'has-vote' : 'no-vote'}`}>
                      <span className="speaker-label" style={{ color: consensus.isTie ? 'var(--accent-crimson)' : (hasLocalVote ? 'var(--accent-amber)' : 'var(--text-secondary)') }}>
                        {consensus.isTie
                          ? t('pages.gameRoom.campaign.levels.interrogation.tieDetected')
                          : hasLocalVote
                            ? t('pages.gameRoom.campaign.levels.interrogation.voteCast', { votes: consensus.votesCast, total: totalPlayers })
                            : t('pages.gameRoom.campaign.levels.interrogation.selectResponse', { votes: consensus.votesCast, total: totalPlayers })
                        }
                      </span>
                      <div className="vote-choices-grid">
                        {q.choices?.map(c => {
                          const isSelected = localVotes[q.id] === c.id;
                          const isNarrativeLocked = checkIsLockedByNarrative(c);
                          const pillClass = isNarrativeLocked
                            ? 'choice-pill locked-choice'
                            : `choice-pill interactable ${isSelected ? 'selected' : ''}`;

                          return (
                            <span
                              key={c.id}
                              className={pillClass}
                              onClick={(e) => {
                                if (isNarrativeLocked || status !== 'active') return;
                                handleSelectChoice(e, q.id, c, status);
                              }}
                              style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}
                            >
                              {isNarrativeLocked ? t('pages.gameRoom.campaign.levels.interrogation.missingIntel') : c.text}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {isGloballyLocked && winningChoice && (
                  <div className="investigator-interaction-area">
                    <div className="chat-bubble agent-bubble">
                      <span className="speaker-label investigator">{t('pages.gameRoom.campaign.levels.interrogation.investigators')}</span>
                      <p>
                        <MessageReveal
                          text={winningChoice.text}
                          skip={skipTyping}
                          cacheKey={`room_${room.id}_investigator_${q.id}`}
                          onComplete={() => handleInvestigatorDone(q.id)}
                        />
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}