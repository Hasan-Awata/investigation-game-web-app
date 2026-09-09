import type { Evidence } from '@/types';

export default function PlaceholderEvidence({ evidence }: { evidence: Evidence }) {
  return (
    <div className="document-variant placeholder-variant">
      <h4 className="evidence-title">{evidence.title}</h4>
      {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
    </div>
  );
}