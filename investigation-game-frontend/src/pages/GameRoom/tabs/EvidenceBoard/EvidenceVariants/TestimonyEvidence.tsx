import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types';
import testimonyEvidence from './TestimonyEvidence.module.css';

export default function TestimonyEvidence({ evidence }: { evidence: Evidence }) {
  const { t } = useTranslation();

  return (
    <div className={testimonyEvidence['testimony-variant']}>
      <div className={testimonyEvidence['testimony-paperclip']}></div>
      <div className={testimonyEvidence['testimony-stamp']}>{t('pages.gameRoom.evidence.variants.testimony.transcript')}</div>
      <h4 className={testimonyEvidence['evidence-title']}>{evidence.title}</h4>
      {evidence.description && (
        <p className={testimonyEvidence['evidence-desc']}>{evidence.description}</p>
      )}
    </div>
  );
}