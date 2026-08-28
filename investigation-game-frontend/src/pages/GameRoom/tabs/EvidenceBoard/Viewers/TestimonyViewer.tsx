import React from 'react';
import { useTranslation } from 'react-i18next';
import { sanitizeHtml } from '@/utils/sanitize';
import type { TestimonyEvidence } from '@/types/evidence'; 
import './TestimonyViewer.css';

interface TestimonyViewerProps {
  evidence: TestimonyEvidence;
}

const TestimonyViewer: React.FC<TestimonyViewerProps> = ({ evidence }) => {
  const { t } = useTranslation();
  
  const {
    agency = t('pages.gameRoom.evidence.viewers.testimony.policeDept'),
    title = t('pages.gameRoom.evidence.viewers.testimony.officialTranscript'),
    date = new Date().toLocaleDateString(),
    case_number = `EX-${evidence.id.toString().padStart(3, '0')}`,
    subject_name = 'REDACTED',
    interviewer = 'REDACTED',
    context,
    transcript = []
  } = evidence.metadata || {};

  const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const getSignature = (seed: number) => {
    const idx = (seed % 18) + 1; 
    const fileName = idx === 1 ? 'signature.svg' : `signature-${idx}.svg`;
    return `${backendUrl}/assets/signatures/${fileName}`;
  };

  return (
    <div className="testimony-modal-viewer">
      <div className="testimony-paper">
        
        <div className="testimony-header">
          <div className="testimony-agency">{agency}</div>
          <h2 className="testimony-title">{title}</h2>
          
          <div className="testimony-meta-grid">
            <div className="meta-box">
              <span className="meta-label">{t('pages.gameRoom.evidence.viewers.testimony.date')}</span>
              <span className="meta-value">{date}</span>
            </div>
            <div className="meta-box">
              <span className="meta-label">{t('pages.gameRoom.evidence.viewers.testimony.caseNo')}</span>
              <span className="meta-value">{case_number}</span>
            </div>
          </div>
        </div>

        <div className="testimony-subject-block">
          <div>
            <span className="subject-label">{t('pages.gameRoom.evidence.viewers.testimony.subject')}</span> 
            {subject_name}
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <span className="subject-label">{t('pages.gameRoom.evidence.viewers.testimony.interviewer')}</span> 
            {interviewer}
          </div>
        </div>

        {context && (
          <div className="testimony-context">
            {context}
          </div>
        )}

        <div className="transcript-container">
          <div className="transcript-watermark">
            {t('pages.gameRoom.evidence.viewers.testimony.watermark')}
          </div>
          
          <div className="transcript-content">
            {Array.isArray(transcript) ? (
              transcript.map((line: any, idx: number) => (
                <div key={idx} className={`transcript-line ${line.type === 'q' ? 'transcript-q' : 'transcript-a'}`}>
                  <span className="speaker-tag">{line.speaker}:</span>
                  {line.text}
                </div>
              ))
            ) : (
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(transcript) }} />
            )}
          </div>
        </div>

        <div className="testimony-footer">
          <div className="certification-statement">
            {t('pages.gameRoom.evidence.viewers.testimony.certStatement')}
          </div>
          
          <div className="signature-area">
            <div className="steno-signature">
              <img 
                src={getSignature(evidence.id)} 
                alt="Stenographer Signature" 
                className="steno-signature-img" 
              />
            </div>
            <div className="signature-line">
              {t('pages.gameRoom.evidence.viewers.testimony.stenoSignature')}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TestimonyViewer;