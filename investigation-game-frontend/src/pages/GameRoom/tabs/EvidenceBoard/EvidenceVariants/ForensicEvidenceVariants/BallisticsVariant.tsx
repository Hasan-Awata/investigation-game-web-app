import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types';
import './BallisticsVariant.css';

export default function BallisticsVariant({ evidence }: { evidence: Evidence }) {
  const { t } = useTranslation();

  return (
    <div className="forensic-variant ballistics-variant">
      <div className="evidence-tape">{t('pages.gameRoom.evidence.variants.forensic.evidenceSealed')}</div>

      <div className="ballistics-report">
        <div className="ballistics-header">
          <span className="crosshair-icon">⌖</span>
          <span className="lab-stamp">{t('pages.gameRoom.evidence.variants.forensic.firearmsUnit')}</span>
        </div>

        <div className="forensic-text-content">
          <h4 className="evidence-title">{evidence.title}</h4>
          {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
        </div>
      </div>
    </div>
  );
}