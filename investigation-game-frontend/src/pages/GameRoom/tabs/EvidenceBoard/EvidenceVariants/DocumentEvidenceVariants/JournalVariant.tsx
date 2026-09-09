import type { Evidence } from '@/types';
import './JournalVariant.css';

export default function JournalVariant({ evidence }: { evidence: Evidence }) {
  return (
    <div className="document-variant journal-variant">
      <div className="journal-bookmark"></div>
      <div className="journal-pages-edge"></div>

      <div className="journal-cover">
        <div className="journal-spine"></div>
        <div className="journal-text-content">
          <h4 className="evidence-title">{evidence.title}</h4>
          {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
        </div>
        <div className="journal-elastic-band"></div>
      </div>
    </div>
  );
}