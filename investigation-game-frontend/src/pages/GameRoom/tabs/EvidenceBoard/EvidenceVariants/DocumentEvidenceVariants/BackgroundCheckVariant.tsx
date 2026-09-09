import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types';
import './BackgroundCheckVariant.css';

export default function BackgroundCheckVariant({ evidence }: { evidence: Evidence }) {
  const { t } = useTranslation();

  return (
    <div className="document-variant background-check-variant">
      <div className="background-check-paperclip"></div>

      <div className="background-check-header">
        <span className="background-check-classification">
          {t('pages.gameRoom.evidence.variants.document.dossierRestricted')}
        </span>
        <div className="background-check-barcode"></div>
      </div>

      <div className="background-check-body">
        <div className="background-check-mugshot">
          {evidence.img_url ? (
            <img src={evidence.img_url} alt="Subject Mugshot" className="actual-mugshot-photo" />
          ) : (
            <div className="mugshot-silhouette"></div>
          )}
        </div>

        <div className="background-check-text-content">
          <h4 className="evidence-title">{evidence.title}</h4>
          {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
        </div>
      </div>
    </div>
  );
}