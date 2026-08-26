import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Suspect } from '@/types';
import './SuspectCard.css';

interface SuspectCardProps {
  suspect: Suspect;
  sourcePool: 'unassigned' | 'guilty' | 'innocent';
  isDraggable: boolean;
  isNew: boolean;
  onDragStart: (e: React.DragEvent, suspectId: number, source: 'unassigned' | 'guilty' | 'innocent') => void;
  onInteract: (suspectId: number) => void;
}

export default function SuspectCard({ suspect, sourcePool, isDraggable, isNew, onDragStart, onInteract }: SuspectCardProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [showIntel, setShowIntel] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    onDragStart(e, suspect.id, sourcePool);
    setTimeout(() => setIsDragging(true), 0);
  };

  const toggleIntel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowIntel(!showIntel);
  };

  return (
    <div
      className={`suspect-card ${isDragging ? 'is-dragging' : ''}`}
      draggable={isDraggable && !showIntel} // Prevent dragging while reading intel
      onDragStart={handleDragStart}
      onDragEnd={(e) => { e.stopPropagation(); setIsDragging(false); }}
      onMouseEnter={() => onInteract(suspect.id)}
    >
      {/* Top Left/Right Intel Toggle Button */}
      <button
        className="intel-toggle-btn"
        onClick={toggleIntel}
        title={showIntel ? t('pages.gameRoom.suspects.card.closeIntel') : t('pages.gameRoom.suspects.card.viewIntel')}
      >
        {showIntel ? '✕' : 'ℹ'}
      </button>

      {isNew && <div className="unread-indicator" title="Unread Suspect Intel"></div>}

      {showIntel ? (
        <div className="suspect-intel-overlay" onPointerDownCapture={(e) => e.stopPropagation()}>
          <h5 className="intel-header">{t('pages.gameRoom.suspects.card.backgroundIntel')}</h5>
          <p className="intel-text">{suspect.background || t('pages.gameRoom.suspects.card.noBackground')}</p>
        </div>
      ) : (
        <>
          <div
            className="suspect-mugshot"
            style={{ backgroundImage: `url(${suspect.img_url || '/placeholder-mugshot.jpg'})` }}
          />
          <div className="suspect-info">
            <h4 className="suspect-name" title={suspect.name}>{suspect.name}</h4>
            <span className="suspect-id">{t('pages.gameRoom.suspects.card.pid')}{suspect.id.toString().padStart(4, '0')}</span>
          </div>
        </>
      )}
    </div>
  );
}