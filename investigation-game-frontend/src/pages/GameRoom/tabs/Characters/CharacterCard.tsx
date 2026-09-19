import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDraggable } from '@dnd-kit/core';
import type { Character } from '@/types';
import styles from './CharacterCard.module.css';

interface CharacterCardProps {
  character: Character;
  sourcePool: 'unassigned' | 'guilty';
  isDraggable: boolean;
  isNew: boolean;
  onInteract: (characterId: number) => void;
}

export default function CharacterCard({ character, sourcePool, isDraggable, isNew, onInteract }: CharacterCardProps) {
  const { t } = useTranslation();
  const [showIntel, setShowIntel] = useState(false);
  const isDeceased = character.current_status === 'deceased';

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `character-${character.id}`,
    disabled: !isDraggable || showIntel,
    data: { 
      type: 'CHARACTER', // Critical for the router
      characterId: character.id,
      sourcePool 
    }
  });

  const toggleIntel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowIntel(!showIntel);
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${styles.characterCard} ${isDragging ? styles.isDragging : ''} ${isDeceased ? styles.isDeceased : ''} ${sourcePool === 'guilty' ? styles.inGuiltyZone : ''}`}
      onMouseEnter={() => onInteract(character.id)}
      style={{ opacity: isDragging ? 0.4 : 1, touchAction: 'none' }}
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
        onPointerDownCapture={(e) => { e.stopPropagation(); toggleIntel(e); }}
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

export function CharacterCardOverlay({ character, sourcePool }: { character: Character, sourcePool: 'unassigned' | 'guilty' }) {
  const { t } = useTranslation();
  const isDeceased = character.current_status === 'deceased';

  return (
    <div className={`${styles.characterCard} ${isDeceased ? styles.isDeceased : ''} ${sourcePool === 'guilty' ? styles.inGuiltyZone : ''}`}>
      {isDeceased && (
        <div className={styles.deceasedOverlay}>
          <span className={styles.deceasedStamp}>{t('pages.gameRoom.characters.deceased', 'DECEASED')}</span>
        </div>
      )}
      <div
        className={styles.characterMugshot}
        style={{ backgroundImage: `url(${character.img_url || '/placeholder-mugshot.jpg'})` }}
      />
      <div className={styles.characterInfo}>
        <h4 className={styles.characterName} title={character.name}>{character.name}</h4>
      </div>
    </div>
  );
}