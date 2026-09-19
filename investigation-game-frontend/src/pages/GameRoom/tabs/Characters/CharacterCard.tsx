import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Character } from '@/types';
import styles from './CharacterCard.module.css';

interface CharacterCardProps {
  character: Character;
  sourcePool: 'unassigned' | 'guilty';
  isDraggable: boolean;
  isNew: boolean;
  onDragStart: (e: React.DragEvent, characterId: number, source: 'unassigned' | 'guilty') => void;
  onInteract: (characterId: number) => void;
}

export default function CharacterCard({ character, sourcePool, isDraggable, isNew, onDragStart, onInteract }: CharacterCardProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [showIntel, setShowIntel] = useState(false);

  const isDeceased = character.current_status === 'deceased';

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    onDragStart(e, character.id, sourcePool);
    setTimeout(() => setIsDragging(true), 0);
  };

  const toggleIntel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowIntel(!showIntel);
  };

  return (
    <div
      className={`${styles.characterCard} ${isDragging ? styles.isDragging : ''} ${isDeceased ? styles.isDeceased : ''} ${sourcePool === 'guilty' ? styles.inGuiltyZone : ''}`}
      draggable={isDraggable && !showIntel} 
      onDragStart={handleDragStart}
      onDragEnd={(e) => { e.stopPropagation(); setIsDragging(false); }}
      onMouseEnter={() => onInteract(character.id)}
    >
      {isDeceased && (
        <div className={styles.deceasedOverlay}>
          {!showIntel && (
            <span className={styles.deceasedStamp}>{t('pages.gameRoom.characters.deceased', 'DECEASED')}</span>
          )}
        </div>
      )}

      <button
        className={styles.intelToggleBtn}
        onClick={toggleIntel}
        title={showIntel ? t('pages.gameRoom.suspects.card.closeIntel') : t('pages.gameRoom.suspects.card.viewIntel')}
      >
        {showIntel ? '✕' : 'ℹ'}
      </button>

      {isNew && <div className={styles.unreadIndicator} title="Unread Intel"></div>}

      {showIntel ? (
        <div className={styles.intelOverlay} onPointerDownCapture={(e) => e.stopPropagation()}>
          <h5 className={styles.intelHeader}>{t('pages.gameRoom.suspects.card.backgroundIntel')}</h5>
          <p className={styles.intelText}>{character.background || t('pages.gameRoom.suspects.card.noBackground')}</p>
        </div>
      ) : (
        <>
          <div
            className={styles.characterMugshot}
            style={{ backgroundImage: `url(${character.img_url || '/placeholder-mugshot.jpg'})` }}
          />
          <div className={styles.characterInfo}>
            <h4 className={styles.characterName} title={character.name}>{character.name}</h4>
          </div>
        </>
      )}
    </div>
  );
}