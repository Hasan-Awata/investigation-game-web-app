import type { Evidence } from '../../../types';
import DocumentEvidence from './EvidenceVariants/DocumentEvidence';
import TestimonyEvidence from './EvidenceVariants/TestimonyEvidence';
import AudioEvidence from './EvidenceVariants/AudioEvidence';
import ImageEvidence from './EvidenceVariants/ImageEvidence';
import ForensicEvidence from './EvidenceVariants/ForensicEvidence';
import './EvidenceBoard.css';

// 1. Create the component map
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
  onInspect: (evidence: Evidence) => void;
}

export default function EvidenceCard({ evidence, index, onInspect }: EvidenceCardProps) {
  // 2. Dynamically resolve the correct component
  const SpecificEvidenceComponent = EvidenceComponents[evidence.evidence_type];

  // Fallback gracefully if an unknown type is passed from the API
  if (!SpecificEvidenceComponent) {
    console.warn(`System Error: Unknown evidence type encountered -> ${evidence.evidence_type}`);
    return null; 
  }

  return (
    <div 
      className={`evidence-card-wrapper item-${index % 5}`} 
      onClick={() => onInspect(evidence)}
    >
      {/* 3. Render the resolved component */}
      <SpecificEvidenceComponent evidence={evidence} />
    </div>
  );
}