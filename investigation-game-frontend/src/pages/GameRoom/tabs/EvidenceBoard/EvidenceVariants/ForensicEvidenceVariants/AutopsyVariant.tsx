import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types';
import './AutopsyVariant.css';

export default function AutopsyVariant({ evidence }: { evidence: Evidence }) {
  const { t } = useTranslation();

  return (
    <div className="forensic-variant autopsy-variant">
      <div className="medical-file-cover">
        <div className="medical-header">
          <span className="medical-cross">✚</span>
          <span className="coroner-stamp">{t('pages.gameRoom.evidence.variants.forensic.medicalExaminer')}</span>
        </div>

        <div className="forensic-text-content">
          <h4 className="evidence-title">{evidence.title}</h4>
          {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
        </div>
      </div>
    </div>
  );
}