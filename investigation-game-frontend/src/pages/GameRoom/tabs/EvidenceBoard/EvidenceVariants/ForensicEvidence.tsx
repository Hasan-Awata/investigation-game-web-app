import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types';
import './ForensicEvidence.css';

export default function ForensicEvidence({ evidence }: { evidence: Evidence }) {
  const { t } = useTranslation();

  return (
    <div className="forensic-variant forensic-report">
      <div className="forensic-top">
        <span className="forensic-category">{t('pages.gameRoom.evidence.variants.forensic.report')}</span>
        <span className="medical-icon" aria-hidden="true">⚕</span>
      </div>

      <h4 className="evidence-title">{evidence.title}</h4>
      {evidence.description && <p className="evidence-desc">{evidence.description}</p>}

      <div className="forensic-footer">
        <span className="barcode-lines" aria-hidden="true"></span>
      </div>
    </div>
  );
}