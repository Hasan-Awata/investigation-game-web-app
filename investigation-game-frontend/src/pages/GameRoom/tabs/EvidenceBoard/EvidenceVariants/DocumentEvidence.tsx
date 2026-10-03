import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types';
import documentEvidence from './DocumentEvidence.module.css';

export default function DocumentEvidence({ evidence }: { evidence: Evidence }) {
  const { t } = useTranslation();

  return (
    <div className={`document-variant ${documentEvidence['manilla-folder']}`}>
      <div className={documentEvidence['folder-tab']} aria-hidden="true" />
      
      <div className={documentEvidence['folder-top']}>
        <span className={documentEvidence['folder-category']}>{t('pages.gameRoom.evidence.variants.document.folder')}</span>
      </div>

      <h4 className={documentEvidence['evidence-title']}>{evidence.title}</h4>
      {evidence.description && <p className={documentEvidence['evidence-desc']}>{evidence.description}</p>}
    </div>
  );
}