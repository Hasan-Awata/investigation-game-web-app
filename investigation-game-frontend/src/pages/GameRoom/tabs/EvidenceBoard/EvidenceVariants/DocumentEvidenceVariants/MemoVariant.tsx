import type { Evidence } from '@/types';
import type { DocumentEvidence as DocEvType } from '@/types/evidence';
import './MemoVariant.css';

export default function MemoVariant({ evidence }: { evidence: Evidence }) {
  const memoEvidence = evidence as Extract<DocEvType, { sub_type: 'memo' }>;
  const isSticky = memoEvidence.metadata.style === 'sticky';

  if (isSticky) {
    return (
      <div className="document-variant memo-sticky-variant">
        <div className="sticky-tape"></div>
        <div className="memo-content">
          <h4 className="evidence-title">{evidence.title}</h4>
          {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="document-variant memo-variant">
      <div className="notebook-holes"></div>
      <div className="crumpled-texture"></div>

      <div className="memo-content">
        <h4 className="evidence-title">{evidence.title}</h4>
        {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
      </div>
    </div>
  );
}