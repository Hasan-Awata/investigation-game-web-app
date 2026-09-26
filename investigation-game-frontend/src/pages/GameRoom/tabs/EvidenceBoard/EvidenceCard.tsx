import type { FC } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { EvidenceBoardEntry, EvidenceType } from '@/types/evidence';
import {
  AudioThumbnail,
  BallisticsThumbnail,
  CustomThumbnail,
  DigitalThumbnail,
  DocumentThumbnail,
  ForensicThumbnail,
  ImageThumbnail,
  TestimonyThumbnail,
} from './Thumbnails';
import styles from './EvidenceCard.module.css';

interface EvidenceCardProps {
  evidence: EvidenceBoardEntry;
  index: number;
  isNew: boolean;
  onInspect: (evidence: EvidenceBoardEntry) => void;
}

type ThumbnailComponent = FC<{ evidence: EvidenceBoardEntry }>;

/**
 * Every EvidenceType has an entry. A custom artifact is a sandboxed document,
 * so falling back to the written-document thumbnail would mislabel it on the
 * board.
 */
const ThumbnailRegistry: Record<EvidenceType, ThumbnailComponent> = {
  document: DocumentThumbnail,
  testimony: TestimonyThumbnail,
  image: ImageThumbnail,
  audio: AudioThumbnail,
  forensic: ForensicThumbnail,
  digital: DigitalThumbnail,
  ballistics: BallisticsThumbnail,
  custom: CustomThumbnail,
};

export default function EvidenceCard({ evidence, index, isNew, onInspect }: EvidenceCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: evidence.id, // Keep this as the raw ID so addToTray(active.id) still works in the layout
    data: {
      type: 'EVIDENCE', // <--- This tells the layout router what is being dragged
    },
  });

  const Thumbnail = ThumbnailRegistry[evidence.evidence_type];

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${styles.evidenceCardWrapper} ${styles[`item${index % 5}`]} ${isDragging ? styles.isDragging : ''}`}
      onClick={() => onInspect(evidence)}
    >
      {isNew && <div className={styles.unreadIndicator} title="Unread Intel"></div>}
      <Thumbnail evidence={evidence} />
    </div>
  );
}

// ----------------------------------------------------------------------
// OVERLAY CLONE: Used exclusively by <DragOverlay> to provide visual feedback.
// Keeps the component pure and prevents hook-duplication errors in dnd-kit.
// ----------------------------------------------------------------------
export function EvidenceCardOverlay({ evidence }: { evidence: EvidenceBoardEntry }) {
  const Thumbnail = ThumbnailRegistry[evidence.evidence_type];

  return (
    <div className={`${styles.evidenceCardWrapper} ${styles.overlayClone}`}>
      <Thumbnail evidence={evidence} />
    </div>
  );
}