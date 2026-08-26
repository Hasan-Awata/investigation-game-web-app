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

  if (!SpecificEvidenceComponent) {
    console.warn(`System Error: Unknown evidence type encountered -> ${evidence.evidence_type}`);
    return null;
  }

  return (
    <div
      className={`evidence-card-wrapper item-${index % 5}`}
      onClick={() => onInspect(evidence)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('evidenceId', evidence.id.toString());
      }}
    >
      {isNew && <div className="unread-indicator" title="Unread Intel"></div>}
      <SpecificEvidenceComponent evidence={evidence} />
    </div>
  );
}