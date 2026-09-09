import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types';
import './DnaVariant.css';

export default function DnaVariant({ evidence }: { evidence: Evidence }) {
  const { t } = useTranslation();

  return (
    <div className="forensic-variant dna-variant">
      <div className="biohazard-strip"></div>

      <div className="dna-report">
        <div className="dna-header">
          <span className="dna-icon">🧬</span>
          <span className="lab-stamp">{t('pages.gameRoom.evidence.variants.forensic.dnaProfile')}</span>
        </div>

        <div className="dna-sequence-graphic"></div>

        <div className="forensic-text-content">
          <h4 className="evidence-title">{evidence.title}</h4>
          {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
        </div>
      </div>
    </div>
  );
}