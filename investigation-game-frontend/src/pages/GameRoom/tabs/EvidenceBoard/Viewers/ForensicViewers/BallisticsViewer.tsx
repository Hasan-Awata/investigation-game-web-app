import React from 'react';
import { useTranslation } from 'react-i18next';
import { sanitizeHtml } from '@/utils/sanitize';
import type { ForensicEvidence } from '@/types/evidence';
import './BallisticsViewer.css';

type BallisticsEvidence = Extract<ForensicEvidence, { sub_type: 'ballistics' }>;

interface BallisticsViewerProps {
  evidence: BallisticsEvidence;
}

const BallisticsViewer: React.FC<BallisticsViewerProps> = ({ evidence }) => {
  const { t } = useTranslation();
  const { metadata } = evidence;

  return (
    <div className="forensic-preview ballistics-modal-viewer">
      <div className="ballistics-header">
        <div className="ballistics-agency-block">
          <div className="ballistics-agency">{t('pages.gameRoom.evidence.viewers.ballistics.stateForensicLab')}</div>
          <h2 className="ballistics-title">{t('pages.gameRoom.evidence.viewers.ballistics.divBallistics')}</h2>
          <div className="ballistics-sub-meta">{t('pages.gameRoom.evidence.viewers.ballistics.caseFile')} {metadata.case_number}</div>
          <div className="ballistics-lab-stamp">{t('pages.gameRoom.evidence.viewers.ballistics.officialLabReport')}</div>
        </div>
        <div className="ballistics-barcode">*{metadata.case_number}*</div>
      </div>

      <div className="ballistics-specimen-box">
        <div className="ballistics-specimen-title">{t('pages.gameRoom.evidence.viewers.ballistics.intakeLog')}</div>
        {(metadata.exhibits || []).map((ex: any, idx: number) => (
          <div key={idx} className="ballistics-specimen-row">
            <span className="ballistics-specimen-label">{ex.reference}:</span>
            <span className="ballistics-specimen-desc" dangerouslySetInnerHTML={{ __html: sanitizeHtml(ex.description || '') }} />
          </div>
        ))}
        {(!metadata.exhibits || metadata.exhibits.length === 0) && (
          <div style={{ fontStyle: 'italic', color: '#666' }}>{t('pages.gameRoom.evidence.viewers.ballistics.noExhibits')}</div>
        )}
      </div>

      <div className="ballistics-section">
        <div className="ballistics-section-title">{t('pages.gameRoom.evidence.viewers.ballistics.section1')}</div>
        <div className="ballistics-text" dangerouslySetInnerHTML={{ __html: sanitizeHtml(metadata.firearm_specs || '') }} />
      </div>

      <div className="ballistics-section">
        <div className="ballistics-section-title">{t('pages.gameRoom.evidence.viewers.ballistics.section2')}</div>
        <div className="ballistics-text" dangerouslySetInnerHTML={{ __html: sanitizeHtml(metadata.microscopic_analysis || '') }} />
      </div>

      {evidence.img_url && (
        <div className="microscope-photo-attachment">
          <div className="microscope-tape"></div>
          <div className="microscope-comparison">
            <img src={evidence.img_url} alt="Microscopic Striations" className="microscope-image" />
            <div className="microscope-crosshair-v"></div>
            <div className="microscope-crosshair-h"></div>
            <div className="microscope-overlay-text">{t('pages.gameRoom.evidence.viewers.ballistics.lensOverlay')}</div>
          </div>
        </div>
      )}

      {metadata.trajectory_range && (
        <div className="ballistics-section">
          <div className="ballistics-section-title">{t('pages.gameRoom.evidence.viewers.ballistics.section3')}</div>
          <div className="ballistics-text" dangerouslySetInnerHTML={{ __html: sanitizeHtml(metadata.trajectory_range || '') }} />
        </div>
      )}

      <div className="ballistics-conclusion-box">
        <div className="ballistics-conclusion" dangerouslySetInnerHTML={{ __html: sanitizeHtml(metadata.conclusion || '') }} />
      </div>

      <div className="ballistics-sign-off">
        <div className="ballistics-sign-content">
          <div className="signature-ink">{metadata.examiner_name}</div>
          <div className="ballistics-signature-line">{t('pages.gameRoom.evidence.viewers.ballistics.seniorExpert')}</div>
          <div className="ballistics-verified-id">{t('pages.gameRoom.evidence.viewers.ballistics.verifiedLabId')} {metadata.case_number}</div>
        </div>
      </div>

      {metadata.investigator_notes && (
        <div className="handwritten-note-overlay">
          {metadata.investigator_notes}
        </div>
      )}
    </div>
  );
};

export default BallisticsViewer;