import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types';
import './DigitalForensicsVariant.css';

export default function DigitalForensicsVariant({ evidence }: { evidence: Evidence }) {
  const { t } = useTranslation();

  return (
    <div className="forensic-variant digital-variant">
      <div className="drive-casing-top"></div>

      <div className="digital-screen">
        <div className="scanlines"></div>

        <div className="digital-header">
          <span className="terminal-prompt">{'>_'}</span>
          <span className="lab-stamp">{t('pages.gameRoom.evidence.variants.forensic.dataExtraction')}</span>
        </div>

        <div className="forensic-text-content">
          <h4 className="evidence-title">{evidence.title}</h4>
          {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
        </div>
      </div>
    </div>
  );
}