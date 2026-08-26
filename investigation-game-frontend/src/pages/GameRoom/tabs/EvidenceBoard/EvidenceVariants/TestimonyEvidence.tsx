import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types';
import './TestimonyEvidence.css';

export default function TestimonyEvidence({ evidence }: { evidence: Evidence }) {
  const { t } = useTranslation();

  return (
    <div className="testimony-variant">
      <div className="testimony-paperclip"></div>
      <div className="testimony-stamp">{t('pages.gameRoom.evidence.variants.testimony.transcript')}</div>
      <h4 className="evidence-title">{evidence.title}</h4>
      {evidence.description && (
        <p className="evidence-desc">{evidence.description}</p>
      )}
    </div>
  );
}