import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Evidence } from '@/types';
import DocumentEvidence from './EvidenceVariants/DocumentEvidence';
import TestimonyEvidence from './EvidenceVariants/TestimonyEvidence';
import AudioEvidence from './EvidenceVariants/AudioEvidence';
import ImageEvidence from './EvidenceVariants/ImageEvidence';
import ForensicEvidence from './EvidenceVariants/ForensicEvidence';
import './EvidenceBoardTab.css';
import './EvidenceCard.css';

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
    id: evidence.id,
    data: { evidence },
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
      className={`evidence-card-wrapper item-${index % 5} ${isDragging ? 'is-dragging' : ''}`}
      onClick={() => onInspect(evidence)}
      style={{ opacity: isDragging ? 0.3 : 1, touchAction: 'none' }}
    >
      {isNew && <div className="unread-indicator" title="Unread Intel"></div>}
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
    <div className="evidence-card-wrapper overlay-clone" style={{ cursor: 'grabbing', transform: 'scale(1.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
      <SpecificEvidenceComponent evidence={evidence} />
    </div>
  );
}