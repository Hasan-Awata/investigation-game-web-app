import type { Evidence } from '@/types';

export default function TestimonyEvidence({ evidence }: { evidence: Evidence }) {
  return (
    <div className="evidence-variant testimony-variant">
      <div className="testimony-paperclip"></div>
      <div className="testimony-stamp">TRANSCRIPT</div>
      <h4 className="evidence-title">{evidence.title}</h4>
      <span className="evidence-id">EX-{evidence.id.toString().padStart(3, '0')}</span>
      {evidence.description && (
        <p className="evidence-desc">{evidence.description}</p>
      )}
    </div>
  );
}