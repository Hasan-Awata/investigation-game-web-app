import type { Evidence } from '@/types';
import type { DocumentEvidence as DocEvType } from '@/types/evidence';
import './DocumentEvidence.css';

import FinancialVariant from './DocumentEvidenceVariants/FinancialVariant';
import CorrespondenceVariant from './DocumentEvidenceVariants/CorrespondenceVariant';
import JournalVariant from './DocumentEvidenceVariants/JournalVariant';
import ContractVariant from './DocumentEvidenceVariants/ContractVariant';
import MemoVariant from './DocumentEvidenceVariants/MemoVariant';
import BackgroundCheckVariant from './DocumentEvidenceVariants/BackgroundCheckVariant';
import PlaceholderVariant from './DocumentEvidenceVariants/PlaceholderVariant';
import PhoneRecordsVariant from './DocumentEvidenceVariants/PhoneRecordsVariant';

export default function DocumentEvidence({ evidence }: { evidence: Evidence }) {
  const docEvidence = evidence as DocEvType;
  const subType = docEvidence.sub_type || 'default';

  switch (subType) {
    case 'financial':
      return <FinancialVariant evidence={evidence} />;
    case 'correspondence':
      return <CorrespondenceVariant evidence={evidence} />;
    case 'journal':
      return <JournalVariant evidence={evidence} />;
    case 'contract':
      return <ContractVariant evidence={evidence} />;
    case 'memo':
      return <MemoVariant evidence={evidence} />;
    case 'background_check':
      return <BackgroundCheckVariant evidence={evidence} />;
    case 'phone_records':
      return <PhoneRecordsVariant evidence={evidence} />;
    default:
      return <PlaceholderVariant evidence={evidence} />;
  }
}