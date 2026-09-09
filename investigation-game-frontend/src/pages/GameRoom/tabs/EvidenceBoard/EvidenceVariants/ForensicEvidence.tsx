import type { Evidence } from '@/types';
import type { ForensicEvidence as ForensicEvType } from '@/types/evidence';
import './ForensicEvidence.css';

import AutopsyVariant from './ForensicEvidenceVariants/AutopsyVariant';
import BallisticsVariant from './ForensicEvidenceVariants/BallisticsVariant';
import DnaVariant from './ForensicEvidenceVariants/DnaVariant';
import DigitalForensicsVariant from './ForensicEvidenceVariants/DigitalForensicsVariant';
import TraceAnalysisVariant from './ForensicEvidenceVariants/TraceAnalysisVariant';
import PlaceholderVariant from './ForensicEvidenceVariants/PlaceholderVariant';

export default function ForensicEvidence({ evidence }: { evidence: Evidence }) {
  const forensicEv = evidence as ForensicEvType;
  const subType = forensicEv.sub_type || 'default';

  switch (subType) {
    case 'autopsy':
      return <AutopsyVariant evidence={evidence} />;
    case 'ballistics':
      return <BallisticsVariant evidence={evidence} />;
    case 'dna':
      return <DnaVariant evidence={evidence} />;
    case 'digital_forensics':
      return <DigitalForensicsVariant evidence={evidence} />;
    case 'trace_analysis':
      return <TraceAnalysisVariant evidence={evidence} />;
    default:
      return <PlaceholderVariant evidence={evidence} />;
  }
}