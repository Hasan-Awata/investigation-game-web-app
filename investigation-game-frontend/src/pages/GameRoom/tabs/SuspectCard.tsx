import { useState } from 'react';
import type { Suspect } from '../../../types';
import './SuspectCard.css';

interface SuspectCardProps {
  suspect: Suspect;
  sourcePool: 'unassigned' | 'guilty' | 'innocent';
  isDraggable: boolean;
  onDragStart: (e: React.DragEvent, suspectId: number, source: 'unassigned' | 'guilty' | 'innocent') => void;
}

export default function SuspectCard({ suspect, sourcePool, isDraggable, onDragStart }: SuspectCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    // 1. Stop the event from bubbling up and capturing the entire flex row
    e.stopPropagation();

    // 2. Pass the data back to the parent tab
    onDragStart(e, suspect.id, sourcePool);

    // 3. Hide the original card AFTER the browser generates the cursor ghost
    setTimeout(() => setIsDragging(true), 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    // Restore visibility when dropped, whether in a new zone or cancelled
    setIsDragging(false);
  };

  return (
    <div 
      className={`suspect-card ${isDragging ? 'is-dragging' : ''}`}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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