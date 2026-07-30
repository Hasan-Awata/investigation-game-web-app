import type { Evidence } from '../../../../types';

export default function DocumentEvidence({ evidence }: { evidence: Evidence }) {
  return (
    <div className="evidence-variant document-variant">
      <div className="folder-tab"></div>
      <h4 className="evidence-title">{evidence.title}</h4>
      <span className="evidence-id">EX-{evidence.id.toString().padStart(3, '0')}</span>
      <p className="evidence-desc">{evidence.description}</p>
    </div>
  );
}