import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types';
import './ContractVariant.css';

export default function ContractVariant({ evidence }: { evidence: Evidence }) {
  const { t } = useTranslation();

  return (
    <div className="document-variant contract-variant">
      <div className="manila-back">
        <div className="manila-tab">
          <div className="manila-label">
            <span className="label-text">{t('pages.gameRoom.evidence.variants.document.contractLegalFiles')}</span>
          </div>
        </div>
      </div>

      <div className="manila-front">
        <div className="manila-text-content">
          <h4 className="evidence-title">{evidence.title}</h4>
          {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
        </div>
      </div>
    </div>
  );
}