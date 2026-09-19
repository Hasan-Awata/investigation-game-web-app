import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Evidence } from '@/types';
import DocumentEvidence from './EvidenceVariants/DocumentEvidence';
import TestimonyEvidence from './EvidenceVariants/TestimonyEvidence';
import AudioEvidence from './EvidenceVariants/AudioEvidence';
import ImageEvidence from './EvidenceVariants/ImageEvidence';
import ForensicEvidence from './EvidenceVariants/ForensicEvidence';
import styles from './EvidenceCard.module.css';

const EvidenceComponents: Record<string, React.FC<{ evidence: Evidence }>> = {
  document: DocumentEvidence,
  testimony: TestimonyEvidence,
  audio: AudioEvidence,
  image: ImageEvidence,
  forensic: ForensicEvidence,
};

interface EvidenceCardProps {
  evidence: Evidence;
  index: number;
  isNew: boolean;
  onInspect: (evidence: Evidence) => void;
}

export default function EvidenceCard({ evidence, index, isNew, onInspect }: EvidenceCardProps) {
  const SpecificEvidenceComponent = EvidenceComponents[evidence.evidence_type];

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: evidence.id, // Keep this as the raw ID so addToTray(active.id) still works in the layout
    data: { 
      type: 'EVIDENCE' // <--- This tells the layout router what is being dragged
    }
  });

  if (!SpecificEvidenceComponent) {
    console.warn(`System Error: Unknown evidence type encountered -> ${evidence.evidence_type}`);
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${styles.evidenceCardWrapper} ${styles[`item${index % 5}`]} ${isDragging ? styles.isDragging : ''}`}
      onClick={() => onInspect(evidence)}
    >
      {isNew && <div className={styles.unreadIndicator} title="Unread Intel"></div>}
      <SpecificEvidenceComponent evidence={evidence} />
    </div>
  );
}

// ----------------------------------------------------------------------
// OVERLAY CLONE: Used exclusively by <DragOverlay> to provide visual feedback.
// Keeps the component pure and prevents hook-duplication errors in dnd-kit.
// ----------------------------------------------------------------------
export function EvidenceCardOverlay({ evidence }: { evidence: Evidence }) {
  const SpecificEvidenceComponent = EvidenceComponents[evidence.evidence_type];
  if (!SpecificEvidenceComponent) return null;

  return (
    <div className={`${styles.evidenceCardWrapper} ${styles.overlayClone}`}>
      <SpecificEvidenceComponent evidence={evidence} />
    </div>
  );
}