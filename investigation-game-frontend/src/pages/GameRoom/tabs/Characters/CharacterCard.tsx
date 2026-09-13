import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Character } from '@/types';
import './CharacterCard.css';

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
      className={`character-card ${isDragging ? 'is-dragging' : ''} ${isDeceased ? 'is-deceased' : ''}`}
      draggable={isDraggable && !showIntel} 
      onDragStart={handleDragStart}
      onDragEnd={(e) => { e.stopPropagation(); setIsDragging(false); }}
      onMouseEnter={() => onInteract(character.id)}
    >
      {isDeceased && !showIntel && (
        <div className="deceased-stamp">{t('pages.gameRoom.characters.deceased', 'DECEASED')}</div>
      )}

      <button
        className="intel-toggle-btn"
        onClick={toggleIntel}
        title={showIntel ? t('pages.gameRoom.suspects.card.closeIntel') : t('pages.gameRoom.suspects.card.viewIntel')}
      >
        {showIntel ? '✕' : 'ℹ'}
      </button>

      {isNew && <div className="unread-indicator" title="Unread Intel"></div>}

      {showIntel ? (
        <div className="character-intel-overlay" onPointerDownCapture={(e) => e.stopPropagation()}>
          <h5 className="intel-header">{t('pages.gameRoom.suspects.card.backgroundIntel')}</h5>
          <p className="intel-text">{character.background || t('pages.gameRoom.suspects.card.noBackground')}</p>
        </div>
      ) : (
        <>
          <div
            className="character-mugshot"
            style={{ backgroundImage: `url(${character.img_url || '/placeholder-mugshot.jpg'})` }}
          />
          <div className="character-info">
            <h4 className="character-name" title={character.name}>{character.name}</h4>
            <span className="character-id">{t('pages.gameRoom.suspects.card.pid', 'PID-')}{character.id.toString().padStart(4, '0')}</span>
          </div>
        </>
      )}
    </div>
  );
}