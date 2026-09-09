import type { Evidence } from '@/types';
import './CorrespondenceVariant.css';

export default function CorrespondenceVariant({ evidence }: { evidence: Evidence }) {
  return (
    <div className="document-variant correspondence-variant">
      <div className="envelope-inside"></div>

      <div className="letter-paper">
        <div className="letter-text-content">
          <h4 className="evidence-title">{evidence.title}</h4>
          {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
        </div>
      </div>

      <div className="envelope-front-wrapper">
        <div className="envelope-flaps">
          <div className="airmail-border"></div>
        </div>
      </div>

      <div className="postage-stamp">
        <div className="stamp-art"></div>
        <div className="cancellation-mark"></div>
      </div>
    </div>
  );
}