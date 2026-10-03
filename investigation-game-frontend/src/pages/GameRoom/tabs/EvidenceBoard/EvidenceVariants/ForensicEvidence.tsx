import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types';
import forensicEvidence from './ForensicEvidence.module.css';

export default function ForensicEvidence({ evidence }: { evidence: Evidence }) {
  const { t } = useTranslation();

  return (
    <div className={`forensic-variant ${forensicEvidence['forensic-report']}`}>
      <div className={forensicEvidence['forensic-top']}>
        <span className={forensicEvidence['forensic-category']}>{t('pages.gameRoom.evidence.variants.forensic.report')}</span>
        <span className={forensicEvidence['medical-icon']} aria-hidden="true">⚕</span>
      </div>

      <h4 className={forensicEvidence['evidence-title']}>{evidence.title}</h4>
      {evidence.description && <p className={forensicEvidence['evidence-desc']}>{evidence.description}</p>}

      <div className={forensicEvidence['forensic-footer']}>
        <span className={forensicEvidence['barcode-lines']} aria-hidden="true"></span>
      </div>
    </div>
  );
}