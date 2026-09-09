import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types';
import './TraceAnalysisVariant.css';

export default function TraceAnalysisVariant({ evidence }: { evidence: Evidence }) {
  const { t } = useTranslation();

  return (
    <div className="forensic-variant trace-variant">
      <div className="zipper-seal"></div>

      <div className="trace-bag-label">
        <div className="trace-header">
          <span className="trace-icon">🔬</span>
          <span className="lab-stamp">{t('pages.gameRoom.evidence.variants.forensic.traceAnalysis')}</span>
        </div>

        <div className="forensic-text-content">
          <h4 className="evidence-title">{evidence.title}</h4>
          {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
        </div>
      </div>
    </div>
  );
}