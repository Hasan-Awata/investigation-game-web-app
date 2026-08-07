import { useState } from 'react';
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
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    onDragStart(e, suspect.id, sourcePool);
    setTimeout(() => setIsDragging(true), 0);
  };

  return (
    <div 
      className={`suspect-card ${isDragging ? 'is-dragging' : ''}`}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={(e) => { e.stopPropagation(); setIsDragging(false); }}
      onMouseEnter={() => onInteract(suspect.id)} // Triggers 'read' state exclusively on hover
    >
      {isNew && <div className="unread-indicator" title="Unread Suspect Intel"></div>}
      
      <div 
        className="suspect-mugshot" 
        style={{ backgroundImage: `url(${suspect.img_url || '/placeholder-mugshot.jpg'})` }}
      />
      <div className="suspect-info">
        <h4 className="suspect-name" title={suspect.name}>{suspect.name}</h4>
        <span className="suspect-id">PID-{suspect.id.toString().padStart(4, '0')}</span>
      </div>
    </div>
  );
}