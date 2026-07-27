import type { Evidence } from '../../../../types';

export default function ForensicEvidence({ evidence }: { evidence: Evidence }) {
  return (
    <div className="evidence-variant forensic-variant">
      <div className="digital-pin crimson"></div>
      <div className="forensic-header">
        <span className="forensic-icon">✧</span>
        <span className="evidence-id">EX-{evidence.id.toString().padStart(3, '0')}</span>
      </div>
      <h4 className="evidence-title">{evidence.title}</h4>
      <p className="evidence-desc">{evidence.description}</p>
    </div>
  );
}