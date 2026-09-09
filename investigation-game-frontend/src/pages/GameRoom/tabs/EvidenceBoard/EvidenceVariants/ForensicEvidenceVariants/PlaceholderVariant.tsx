import type { Evidence } from '@/types';
import './PlaceholderVariant.css';

export default function PlaceholderVariant({ evidence }: { evidence: Evidence }) {
  return (
    <div className="forensic-variant placeholder-forensic">
      <div className="forensic-header">
        <span className="forensic-icon">✧</span>
      </div>
      <h4 className="evidence-title">{evidence.title}</h4>
      {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
    </div>
  );
}