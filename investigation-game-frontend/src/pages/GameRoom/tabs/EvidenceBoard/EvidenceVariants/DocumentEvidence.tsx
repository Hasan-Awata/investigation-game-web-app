import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types';
import './DocumentEvidence.css';

export default function DocumentEvidence({ evidence }: { evidence: Evidence }) {
  const { t } = useTranslation();

  return (
    <div className="document-variant manilla-folder">
      <div className="folder-tab" aria-hidden="true" />
      
      <div className="folder-top">
        <span className="folder-category">{t('pages.gameRoom.evidence.variants.document.folder')}</span>
      </div>

      <h4 className="evidence-title">{evidence.title}</h4>
      {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
    </div>
  );
}