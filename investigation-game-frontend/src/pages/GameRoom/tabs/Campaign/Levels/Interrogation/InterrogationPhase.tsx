import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomData } from '@/context/RoomContext.shared';
import { useInvestigationPhase } from '@/hooks/useInvestigationPhase';
import { getLocalUser } from '@/utils/userState';
import type { Level, Question } from '@/types';
import styles from './InterrogationPhase.module.css';

interface InterrogationPhaseProps { level: Level; }

export default function InterrogationPhase({ level }: InterrogationPhaseProps) {
  const { t } = useTranslation();
  const { room } = useRoomData();
  const { activeGroup, localVotes, isSubmitting, handleSelectChoice, clearVote } = useInvestigationPhase();
  const currentUser = getLocalUser();
  const question = level.questions?.find((item: Question) => item.id === activeGroup?.current_question_id);
  const currentQuestionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    currentQuestionRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [level.id, question?.id]);
  const history = (room.question_resolutions ?? [])
    .filter(resolution => resolution.level_id === level.id)
    .sort((a, b) => a.resolved_at.localeCompare(b.resolved_at) || a.id - b.id)
    .flatMap(resolution => {
      const resolvedQuestion = level.questions?.find(item => item.id === resolution.question_id);
      const answer = resolvedQuestion?.choices?.find(choice => choice.id === resolution.choice_id);
      return resolvedQuestion && answer ? [{ id: resolution.id, question: resolvedQuestion, answer }] : [];
    });
  const requiredVoterIds = activeGroup?.required_voter_ids ?? [];
  const isRequiredVoter = requiredVoterIds.includes(currentUser?.id ?? -1);
  const ownVote = question ? localVotes[question.id] : undefined;
  const voteCount = activeGroup?.votes?.filter(vote => vote.question_id === question?.id && requiredVoterIds.includes(vote.user_id)).length ?? 0;
  const weightedTally = activeGroup?.tally ?? {};
  const maxVotes = Math.max(0, ...Object.values(weightedTally));
  const isTie = Object.values(weightedTally).filter(value => value === maxVotes).length > 1;
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);
  const secondsRemaining = activeGroup?.finalizes_at
    ? Math.max(0, Math.ceil((new Date(activeGroup.finalizes_at).getTime() - now) / 1000))
    : null;

  const hasOpenQuestion = activeGroup?.level_id === level.id && !!question;
  if (!hasOpenQuestion && history.length === 0) {
    return <div className={styles['empty-state']}>{t('pages.gameRoom.campaign.levels.interrogation.waitingForGroup', 'Start or join this interrogation to play.')}</div>;
  }

  return (
    <section aria-label={t('pages.gameRoom.campaign.levels.interrogation.conversation', 'Conversation')} className={styles['interrogation-log']}>
      <div role="log" aria-live="polite" className={styles.conversation}>
        {history.map(exchange => (
          <div key={exchange.id} className={styles['chat-exchange']}>
            <div className={`${styles['chat-bubble']} ${styles['suspect-bubble']}`}>
              <span className={styles['speaker-label']}>{t('pages.gameRoom.campaign.levels.interrogation.interviewee', 'Interviewee')}</span>
              <p>{exchange.question.text}</p>
            </div>
            <div className={`${styles['chat-bubble']} ${styles['agent-bubble']}`}>
              <span className={styles['speaker-label']}>{t('pages.gameRoom.campaign.levels.interrogation.investigator', 'Investigator')}</span>
              <p>{exchange.answer.text}</p>
            </div>
          </div>
        ))}
        {hasOpenQuestion && question && (
          <div ref={currentQuestionRef} className={`${styles['chat-bubble']} ${styles['suspect-bubble']} ${styles['current-question']}`}>
            <span className={styles['speaker-label']}>{t('pages.gameRoom.campaign.levels.interrogation.interviewee', 'Interviewee')}</span>
            <p>{question.text}</p>
          </div>
        )}
      </div>
      {hasOpenQuestion && question && activeGroup && (
        <div className={styles['investigator-interaction-area']} aria-busy={isSubmitting}>
          <div className={styles['response-heading']}>
            <h3>{t('pages.gameRoom.campaign.levels.interrogation.chooseResponse', 'Choose your response')}</h3>
            {ownVote !== undefined && isRequiredVoter && (
              <button className={styles['clear-vote']} type="button" disabled={isSubmitting || room.status !== 'active'} onClick={() => clearVote(question.id)}>
                {t('pages.gameRoom.campaign.levels.interrogation.clearVote', 'Clear my vote')}
              </button>
            )}
          </div>
          <div className={styles['vote-choices-grid']}>
            {question.choices?.map(choice => {
              const selected = ownVote === choice.id;
              const locked = !!choice.requirements?.required_evidence?.some(id => !room.accumulated_evidences?.some(evidence => evidence.id === id));
              return (
                <button key={choice.id} type="button" disabled={!isRequiredVoter || locked || isSubmitting || room.status !== 'active'} aria-pressed={selected}
                  className={styles['response-choice']}
                  onClick={event => handleSelectChoice(event, question.id, choice, 'active')}>
                  <span className={styles['choice-indicator']} aria-hidden="true">
                    {locked ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                      : selected ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 4 4L19 6" /></svg> : null}
                  </span>
                  <span className={styles['choice-copy']}>
                    <span>{choice.text}</span>
                    {locked && <small>{t('pages.gameRoom.campaign.levels.interrogation.evidenceRequired', 'Evidence required')}</small>}
                  </span>
                  <small className={styles['choice-tally']} aria-label={t('pages.gameRoom.campaign.levels.interrogation.weightedVotes', { count: weightedTally[choice.id] ?? 0, defaultValue: 'Weighted vote total: {{count}}' })}>({weightedTally[choice.id] ?? 0})</small>
                </button>
              );
            })}
          </div>
          <div className={styles['voting-details']}>
            <p role="status" className={`${styles['vote-status']} ${isTie ? styles.tied : secondsRemaining !== null ? styles.finalizing : ''}`}>
              <span className={styles['status-marker']} aria-hidden="true" />
              {isTie
                ? t('pages.gameRoom.campaign.levels.interrogation.tieDetected', 'The vote is tied. Change a vote to break the tie.')
                : secondsRemaining !== null
                  ? t('pages.gameRoom.campaign.levels.interrogation.finalizingIn', { seconds: secondsRemaining, defaultValue: 'Finalizing in {{seconds}} seconds' })
                  : t('pages.gameRoom.campaign.levels.interrogation.votesSubmitted', { votes: voteCount, total: requiredVoterIds.length, defaultValue: '{{votes}} of {{total}} required votes submitted' })}
            </p>
            {!isRequiredVoter && <p className={styles['late-join-note']}>{t('pages.gameRoom.campaign.levels.interrogation.voteNextQuestion', 'You will vote starting with the next question.')}</p>}
            <ul className={styles['group-roster']} aria-label={t('pages.gameRoom.campaign.levels.interrogation.groupRoster', 'Group roster')}>
              {activeGroup.members?.map(member => {
                const vote = activeGroup.votes?.find(item => item.question_id === question.id && item.user_id === member.user_id);
                const answer = question.choices?.find(choice => choice.id === vote?.choice_id)?.text;
                const required = requiredVoterIds.includes(member.user_id);
                const status = !required
                  ? t('pages.gameRoom.campaign.levels.interrogation.voteNextQuestion', 'Voting starts next question')
                  : vote
                    ? t('pages.gameRoom.campaign.levels.interrogation.voteSubmitted', { answer, defaultValue: 'Submitted: {{answer}}' })
                    : t('pages.gameRoom.campaign.levels.interrogation.voteWaiting', 'Waiting for vote');
                return <li key={member.user_id}>
                  <span className={styles['member-name']} dir="auto">{member.user?.name ?? `Player ${member.user_id}`}</span>
                  <span className={styles['member-status']}>{status}</span>
                </li>;
              })}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
