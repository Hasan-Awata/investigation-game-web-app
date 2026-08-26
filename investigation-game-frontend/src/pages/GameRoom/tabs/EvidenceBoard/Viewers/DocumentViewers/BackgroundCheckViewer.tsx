import React from 'react';
import { useTranslation } from 'react-i18next';
import type { DocumentEvidence } from '@/types/evidence';
import './BackgroundCheckViewer.css';

type BackgroundCheckEvidence = Extract<DocumentEvidence, { sub_type: 'background_check' }>;

interface BackgroundCheckViewerProps {
  evidence: BackgroundCheckEvidence;
}

const BackgroundCheckViewer: React.FC<BackgroundCheckViewerProps> = ({ evidence }) => {
  const { t } = useTranslation();
  const {
    subject_name, dob, sex_age, aliases, last_known_address,
    employment_financial, criminal_history, associates, investigator_notes
  } = evidence.metadata;

  return (
    <div className="doc-preview bg-check-preview">
      <div className="bg-check-header">
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem', fontFamily: 'var(--font-mono)', color: '#555' }}>
            {t('pages.gameRoom.evidence.viewers.backgroundCheck.deptOfPublicSafety')}
          </div>
          <h2 className="bg-check-title">{t('pages.gameRoom.evidence.viewers.backgroundCheck.title')}</h2>
        </div>
        <div className="bg-check-barcode">*DPS-AUTH-REQ*</div>
      </div>

      <div className="bg-check-id-block">
        <img src={evidence.img_url || '/placeholder-mugshot.jpg'} alt="Subject Mugshot" className="bg-check-mugshot" />

        <div className="bg-check-data">
          <div className="bg-check-data-row">
            <span className="bg-check-label">{t('pages.gameRoom.evidence.viewers.backgroundCheck.subjectName')}</span>
            <span className="bg-check-value">{subject_name}</span>
          </div>
          <div className="bg-check-data-row">
            <span className="bg-check-label">{t('pages.gameRoom.evidence.viewers.backgroundCheck.dob')}</span>
            <span className="bg-check-value">{dob}</span>
          </div>
          <div className="bg-check-data-row">
            <span className="bg-check-label">{t('pages.gameRoom.evidence.viewers.backgroundCheck.sexAge')}</span>
            <span className="bg-check-value">{sex_age}</span>
          </div>
          <div className="bg-check-data-row">
            <span className="bg-check-label">{t('pages.gameRoom.evidence.viewers.backgroundCheck.aliases')}</span>
            <span className="bg-check-value">"{aliases}"</span>
          </div>
          <div className="bg-check-data-row" style={{ borderBottom: 'none' }}>
            <span className="bg-check-label">{t('pages.gameRoom.evidence.viewers.backgroundCheck.lastKnownAddress')}</span>
            <span className="bg-check-value" dangerouslySetInnerHTML={{ __html: last_known_address }} />
          </div>
        </div>
      </div>

      {employment_financial && (
        <div className="bg-check-section">
          <div className="bg-check-section-title">{t('pages.gameRoom.evidence.viewers.backgroundCheck.employmentProfile')}</div>
          <div className="bg-check-text" dangerouslySetInnerHTML={{ __html: employment_financial }} />
        </div>
      )}

      {criminal_history && (
        <div className="bg-check-section">
          <div className="bg-check-section-title">{t('pages.gameRoom.evidence.viewers.backgroundCheck.criminalHistory')}</div>
          <div className="bg-check-text" dangerouslySetInnerHTML={{ __html: criminal_history }} />
        </div>
      )}

      {associates && (
        <div className="bg-check-section">
          <div className="bg-check-section-title">{t('pages.gameRoom.evidence.viewers.backgroundCheck.knownAssociates')}</div>
          <div className="bg-check-text" dangerouslySetInnerHTML={{ __html: associates }} />
        </div>
      )}

      {investigator_notes && (
        <div className="handwritten-note">
          {investigator_notes}
        </div>
      )}
    </div>
  );
};

export default BackgroundCheckViewer;