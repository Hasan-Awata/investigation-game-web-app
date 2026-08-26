import { useTranslation } from 'react-i18next';
import { useRoomState } from '@/context/RoomContext';
import { useInvestigationPhase } from '@/hooks/useInvestigationPhase';
import type { Level, Choice, Question } from '@/types';
import './WiretapPhase.css';

interface WiretapPhaseProps {
  level: Level;
  status: string;
  totalPlayers: number;
  getQuestionConsensus: (question: Question) => { votesCast: number, isResolved: boolean, isTie: boolean, winningChoiceId: number | null };
  isHost: boolean;
  isSubmitting: boolean;
  handleSubmitTheory: (e: React.MouseEvent) => void;
}

export default function WiretapPhase({
  level, status, totalPlayers, getQuestionConsensus, isHost, isSubmitting, handleSubmitTheory
}: WiretapPhaseProps) {
  const { t } = useTranslation();
  const { room, accumulatedEvidences } = useRoomState();
  const { localVotes, handleSelectChoice, triggerWiretap, isTriggeringWiretap } = useInvestigationPhase();

  const playedWiretaps = new Set(room.played_wiretaps?.map((q: any) => q.id) || []);

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

  const visibleQuestions: Question[] = [];
  let currentId: number | null = level.questions[0].id;

  while (currentId) {
    const q = level.questions.find(x => x.id === currentId);
    if (!q) break;
    visibleQuestions.push(q);

    const consensus = getQuestionConsensus(q);
    if (consensus.isResolved && consensus.winningChoiceId) {
      const winningChoice = q.choices?.find(c => c.id === consensus.winningChoiceId);

      if (winningChoice?.outcomes?.next_question_id) {
        currentId = Number(winningChoice.outcomes.next_question_id);
      } else {
        const currentIndex = level.questions.findIndex(x => x.id === q.id);
        currentId = level.questions[currentIndex + 1]?.id || null;
      }
    } else {
      currentId = null;
    }
  }

  const requiredAudios = level.questions?.filter(q => q.audio_url) || [];
  const allAudiosPlayed = requiredAudios.length === 0 || requiredAudios.every(q => playedWiretaps.has(q.id));

  return (
    <div className="wiretap-phase-wrapper">
      <h4 className="drawer-title" style={{ color: 'var(--accent-cyan)', margin: '0 0 1rem 0', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
        {t('pages.gameRoom.campaign.levels.wiretap.activeIntercept')}
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

          const interceptNumber = String(qIdx + 1).padStart(2, '0');

          return (
            <div key={q.id} className="question-item wiretap-item">

              <div className="wiretap-sidebar">
                <span className="question-number">{t('pages.gameRoom.campaign.levels.wiretap.interceptPrefix')}{interceptNumber}</span>
                {isAudioIntercept && !hasBeenPlayed && (
                  <span className="tactical-pulse">🎙️</span>
                )}
                {isAudioIntercept && hasBeenPlayed && (
                  <span style={{ fontSize: '1.2rem', marginTop: '0.75rem', opacity: 0.5 }}>🔇</span>
                )}
              </div>

              <div className="question-body" style={{ width: '100%' }}>
                <p className="question-text" style={{ marginTop: 0 }}>
                  {q.text}
                  {status === 'active' && !isLocked && (
                    <span style={{ display: 'block', fontSize: '0.75rem', color: consensus.isTie ? 'var(--accent-crimson)' : 'var(--text-secondary)', marginTop: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                      {consensus.isTie
                          ? t('pages.gameRoom.campaign.levels.wiretap.tieDetected')
                          : hasLocalVote
                            ? t('pages.gameRoom.campaign.levels.wiretap.voteRecorded', { votes: consensus.votesCast, total: totalPlayers })
                            : t('pages.gameRoom.campaign.levels.wiretap.awaitingConsensus', { votes: consensus.votesCast, total: totalPlayers })
                        }
                    </span>
                  )}
                </p>

                {isAudioIntercept && (
                  <div 
                    className={`wiretap-container ${hasBeenPlayed ? 'played' : ''}`}
                    data-label={hasBeenPlayed ? t('pages.gameRoom.campaign.levels.wiretap.feedSeveredLabel') : t('pages.gameRoom.campaign.levels.wiretap.audioFeedLabel')}
                  >
                    {hasBeenPlayed ? (
                      <div className="wiretap-burned">
                        <span style={{ fontSize: '1.2rem', marginInlineEnd: '0.5rem' }}>🔒</span>
                        {t('pages.gameRoom.campaign.levels.wiretap.connectionSevered')}
                      </div>
                    ) : (
                      <button
                        className="btn-primary play-wiretap-btn"
                        disabled={!isHost || isTriggeringWiretap}
                        onClick={(e) => { e.stopPropagation(); triggerWiretap(q.id, q.audio_url!); }}
                      >
                        {isHost ? t('pages.gameRoom.campaign.levels.wiretap.initiateAudio') : t('pages.gameRoom.campaign.levels.wiretap.awaitingHostAudio')}
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
                          ? t('pages.gameRoom.campaign.levels.wiretap.pathLocked')
                          : (isAudioIntercept && !hasBeenPlayed)
                            ? t('pages.gameRoom.campaign.levels.wiretap.classified')
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

      {status === 'active' && (
        <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(0, 229, 255, 0.2)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          {isHost ? (
            <button
              className="btn-primary"
              disabled={!allAudiosPlayed || isSubmitting}
              onClick={handleSubmitTheory}
              style={{ padding: '1rem 3rem', width: 'auto' }}
            >
              {isSubmitting ? t('pages.gameRoom.campaign.levels.wiretap.processing') : t('pages.gameRoom.campaign.levels.wiretap.submitAnalysis')}
            </button>
          ) : (
            <div style={{ padding: '1rem', background: 'rgba(0, 229, 255, 0.05)', border: '1px dashed rgba(0, 229, 255, 0.2)', borderRadius: '4px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', width: '100%', textAlign: 'center' }}>
              {t('pages.gameRoom.campaign.levels.wiretap.awaitingHostSubmit')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}