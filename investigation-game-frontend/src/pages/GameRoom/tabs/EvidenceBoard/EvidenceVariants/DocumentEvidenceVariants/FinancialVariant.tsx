import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types';
import './FinancialVariant.css';

export default function FinancialVariant({ evidence }: { evidence: Evidence }) {
  const { t } = useTranslation();

  return (
    <div className="document-variant financial-variant">
      <div className="folder-back"></div>

      <div className="folder-papers">
        <div className="paper-sheet paper-1"></div>
        <div className="paper-sheet paper-2">
          <div className="micro-table">
            <div className="micro-row micro-header">
              <div className="micro-col">{t('pages.gameRoom.evidence.variants.document.financialDate')}</div>
              <div className="micro-col flex-2">{t('pages.gameRoom.evidence.variants.document.financialDetail')}</div>
              <div className="micro-col">{t('pages.gameRoom.evidence.variants.document.financialAmount')}</div>
              <div className="micro-col">{t('pages.gameRoom.evidence.variants.document.financialStatus')}</div>
            </div>
            {[...Array(5)].map((_, i) => (
              <div className="micro-row" key={i}>
                <div className="micro-col">0{i + 1}</div>
                <div className="micro-col flex-2">xxxx xxxxx</div>
                <div className="micro-col">$$$$</div>
                <div className="micro-col">{t('pages.gameRoom.evidence.variants.document.financialCleared')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="folder-front">
        <div className="folder-text-content">
          <h4 className="evidence-title">{evidence.title}</h4>
          {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
        </div>
      </div>
    </div>
  );
}