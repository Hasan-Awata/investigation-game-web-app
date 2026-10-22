import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Evidence } from '@/types';
import DocumentEvidence from './EvidenceVariants/DocumentEvidence';
import ForensicEvidence from './EvidenceVariants/ForensicEvidence';
import TestimonyEvidence from './EvidenceVariants/TestimonyEvidence';
import AudioEvidence from './EvidenceVariants/AudioEvidence';
import ImageEvidence from './EvidenceVariants/ImageEvidence';
import DigitalEvidence from './EvidenceVariants/DigitalEvidence';
import styles from './EvidenceCard.module.css';
import { useTranslation } from 'react-i18next';

const EvidenceComponents: Record<string, React.FC<{ evidence: Evidence }>> = {
  document: DocumentEvidence,
  forensic: ForensicEvidence,
  testimony: TestimonyEvidence,
  audio: AudioEvidence,
  image: ImageEvidence,
  digital: DigitalEvidence,
};

interface EvidenceCardProps {
  evidence: Evidence;
  index: number;
  isNew: boolean;
  onInspect: (evidence: Evidence) => void;
}

export default function EvidenceCard({ evidence, index, isNew, onInspect }: EvidenceCardProps) {
  const { t } = useTranslation();
  const SpecificEvidenceComponent = EvidenceComponents[evidence.evidence_type];

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: evidence.id, // Keep this as the raw ID so addEvidenceToTray(active.id) still works in the layout
    data: { 
      type: 'EVIDENCE' // <--- This tells the layout router what is being dragged
    }
  });

  if (!SpecificEvidenceComponent) {
    console.warn(`System Error: Unknown evidence type encountered -> ${evidence.evidence_type}`);
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${styles.evidenceCardWrapper} ${styles[`item${index % 5}`]} ${isDragging ? styles.isDragging : ''}`}
      onClick={() => onInspect(evidence)}
    >
      {isNew && <div className={styles.unreadIndicator} title={t('pages.gameRoom.layout.tabs.unreadIntel')} />}
      {SpecificEvidenceComponent ? (
        <SpecificEvidenceComponent evidence={evidence} />
      ) : (
        <div className={styles.unclassifiedEvidence}>
          <span className={styles.unclassifiedBadge}>{t('pages.gameRoom.evidence.board.unclassified', 'Unclassified Evidence')}</span>
          <h4 className="evidence-title">{evidence.title}</h4>
          {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
        </div>
      )}
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
