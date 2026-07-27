import type { Evidence } from '../../../../types';

export default function TestimonyEvidence({ evidence }: { evidence: Evidence }) {
  return (
    <div className="evidence-variant testimony-variant">
      <div className="digital-pin cyan"></div>
      <div className="quote-mark">“</div>
      <h4 className="evidence-title">{evidence.title}</h4>
      <span className="evidence-id">EX-{evidence.id.toString().padStart(3, '0')}</span>
      <div className="testimony-lines"></div>
    </div>
  );
}