import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomData, useRoomUI } from '@/context/RoomContext';
import { submitSuspectVerdict } from '@/services/api';
import { useMutation } from '@tanstack/react-query';
import CharacterCard from './CharacterCard';
import './CharactersTab.css';

// Removed 'cleared' from the pool types
type PoolType = 'unassigned' | 'guilty';

export default function CharactersTab() {
  const { t } = useTranslation();
  const { room, accumulatedCharacters, refreshRoomData } = useRoomData();
  const { viewedCharacters, markCharacterAsViewed, setGameOverData } = useRoomUI();

  const [guiltyIds, setGuiltyIds] = useState<number[]>(() => {
    try {
      const saved = sessionStorage.getItem(`room_${room.invite_code}_guilty_characters`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const initialLevels = room.game_case?.zones?.flatMap(z => z.levels || []).filter(l => l.is_initial) || [];
  const completedLevelIds = new Set(room.completed_levels?.map(l => l.id) || []);
  const allInitialCompleted = initialLevels.length > 0 && initialLevels.every(l => completedLevelIds.has(l.id));

  const guiltyPool = accumulatedCharacters.filter(c => guiltyIds.includes(c.id));
  // Anyone not explicitly marked guilty is now automatically unassigned (innocent/uninvolved)
  const unassignedPool = accumulatedCharacters.filter(c => !guiltyIds.includes(c.id));

  const verdictMutation = useMutation({
    mutationFn: async (submittedGuiltyIds: number[]) => {
      const result = await submitSuspectVerdict(room.id, submittedGuiltyIds);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: (data) => {
      if (data.status === 'failed') {
        setFeedback({ type: 'error', message: data.message });
        refreshRoomData();
      } else {
        Object.keys(sessionStorage).forEach(key => {
          if (key.includes(`room_${room.invite_code}`) || key.includes(`room_${room.id}`)) {
            sessionStorage.removeItem(key);
          }
        });
        setGameOverData(data.message, data.stats);
        refreshRoomData();
      }
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message });
    }
  });

  const handleDragStart = (e: React.DragEvent, characterId: number, source: PoolType) => {
    e.dataTransfer.setData('characterId', characterId.toString());
    e.dataTransfer.setData('sourcePool', source);
  };

  const handleDrop = (e: React.DragEvent, targetPool: PoolType) => {
    e.preventDefault();

    const characterId = parseInt(e.dataTransfer.getData('characterId'));
    if (isNaN(characterId)) return;

    let nextGuilty = guiltyIds.filter(id => id !== characterId);

    if (targetPool === 'guilty') nextGuilty.push(characterId);

    setGuiltyIds(nextGuilty);
    sessionStorage.setItem(`room_${room.invite_code}_guilty_characters`, JSON.stringify(nextGuilty));
  };

  const handleSubmitVerdict = () => verdictMutation.mutate(guiltyIds);

  const clearFeedback = () => {
    setFeedback(null);
    refreshRoomData();
  };

  // Submission is now allowed as soon as initial leads are completed. No need to categorize everyone.
  const isReadyToSubmit = allInitialCompleted;
  const isNoFoulPlay = guiltyPool.length === 0;

  return (
    <div className="persons-of-interest-tab-container">
      {feedback && (
        <div className="feedback-modal-overlay">
          <div className={`feedback-modal-content ${feedback.type}`}>
            <h3 className="feedback-title">{t('pages.gameRoom.suspects.tab.indictmentRejected')}</h3>
            <p className="feedback-message">{feedback.message}</p>
            <button className="btn-secondary mt-1" onClick={clearFeedback}>{t('pages.gameRoom.suspects.tab.reassessEvidence')}</button>
          </div>
        </div>
      )}

      <div className="verdict-zones">
        <div className="drop-zone guilty-zone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, 'guilty')}>
          <div className="zone-header">
            <h3>{t('pages.gameRoom.suspects.tab.primeSuspects')}</h3>
            <span className="zone-counter">{guiltyPool.length}</span>
          </div>
          <div className="zone-content">
            {guiltyPool.map(c => (
              <CharacterCard key={c.id} character={c} sourcePool="guilty" isDraggable={true} isNew={!viewedCharacters.has(c.id)} onDragStart={handleDragStart} onInteract={markCharacterAsViewed} />
            ))}
            {guiltyPool.length === 0 && <div className="zone-placeholder">{t('pages.gameRoom.suspects.tab.dragPrimeHere')}</div>}
          </div>
        </div>
      </div>

      <div className="unassigned-pool" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, 'unassigned')}>
        <div className="zone-header">
          <h3>{t('pages.gameRoom.suspects.tab.unassigned')}</h3>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {t('pages.gameRoom.suspects.tab.uninvolvedHint', 'Leftover profiles are considered innocent or uninvolved.')}
          </span>
        </div>
        <div className="unassigned-grid">
          {unassignedPool.map(c => (
            <CharacterCard key={c.id} character={c} sourcePool="unassigned" isDraggable={true} isNew={!viewedCharacters.has(c.id)} onDragStart={handleDragStart} onInteract={markCharacterAsViewed} />
          ))}
          {unassignedPool.length === 0 && accumulatedCharacters.length > 0 && <div className="zone-placeholder">{t('pages.gameRoom.suspects.tab.allCategorized')}</div>}
          {accumulatedCharacters.length === 0 && <div className="zone-placeholder">{t('pages.gameRoom.suspects.tab.noSuspects', 'No persons of interest identified.')}</div>}
        </div>
      </div>

      <div className="submit-verdict-container" style={{ flexDirection: 'column', gap: '1rem' }}>
        <button
          className={`btn-primary final-verdict-btn ${isNoFoulPlay ? 'no-foul-play' : ''}`}
          disabled={!isReadyToSubmit || verdictMutation.isPending}
          onClick={handleSubmitVerdict}
        >
          {verdictMutation.isPending
            ? t('pages.gameRoom.suspects.tab.filingIndictment')
            : isNoFoulPlay
              ? t('pages.gameRoom.suspects.tab.ruleAccident')
              : t('pages.gameRoom.suspects.tab.submitIndictment')}
        </button>

        {isReadyToSubmit && isNoFoulPlay && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('pages.gameRoom.suspects.tab.emptyPoolWarning')}</span>}
        {!allInitialCompleted && <span className="lock-warning-text">{t('pages.gameRoom.suspects.tab.lockWarning')}</span>}
      </div>
    </div>
  );
}