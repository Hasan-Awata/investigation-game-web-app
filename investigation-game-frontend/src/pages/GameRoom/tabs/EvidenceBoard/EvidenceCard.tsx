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

function EvidenceCardContent({ evidence }: { evidence: Evidence }) {
  const { t } = useTranslation();
  const { title, description } = evidence;
  switch (evidence.evidence_type) {
    case 'document': return <DocumentEvidence evidence={evidence} />;
    case 'forensic': return <ForensicEvidence evidence={evidence} />;
    case 'testimony': return <TestimonyEvidence evidence={evidence} />;
    case 'audio': return <AudioEvidence evidence={evidence} />;
    case 'image': return <ImageEvidence evidence={evidence} />;
    case 'digital': return <DigitalEvidence evidence={evidence} />;
    default:
      return (
        <div className={styles.unclassifiedEvidence}>
          <span className={styles.unclassifiedBadge}>{t('pages.gameRoom.evidence.board.unclassified', 'Unclassified Evidence')}</span>
          <h4 className={styles.unclassifiedTitle} dir="auto">{title}</h4>
          {description && <p className={styles.unclassifiedDescription} dir="auto">{description}</p>}
        </div>
      );
  }
}

interface EvidenceCardProps {
  evidence: Evidence;
  isNew: boolean;
  onInspect: (evidence: Evidence) => void;
}

export default function EvidenceCard({ evidence, isNew, onInspect }: EvidenceCardProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: evidence.id,
    data: { type: 'EVIDENCE' },
  });
  const unreadLabel = isNew ? t('pages.gameRoom.layout.tabs.unreadIntel') : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label={evidence.title || t('pages.gameRoom.evidence.modal.title')}
      aria-description={unreadLabel}
      data-unread={isNew || undefined}
      data-dragging={isDragging || undefined}
      className={styles.evidenceCardWrapper}
      onClick={() => {
        if (!isDragging) onInspect(evidence);
      }}
      onKeyDown={event => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          listeners?.onKeyDown?.(event);
          return;
        }
        event.preventDefault();
        if (!event.repeat && !isDragging) onInspect(evidence);
      }}
    >
      <EvidenceCardContent evidence={evidence} />
    </div>
  );
}

export function EvidenceCardOverlay({ evidence }: { evidence: Evidence }) {
  return (
    <div className={styles.overlayClone} aria-hidden="true" inert>
      <EvidenceCardContent evidence={evidence} />
    </div>
  );
}
