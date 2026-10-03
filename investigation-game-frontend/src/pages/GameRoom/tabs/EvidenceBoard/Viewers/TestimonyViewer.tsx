import React from 'react';
import { useTranslation } from 'react-i18next';
import { sanitizeHtml } from '@/utils/sanitize';
import type { TestimonyEvidence } from '@/types/evidence'; 
import ViewersContainer from './ViewersContainer';
import testimonyViewer from './TestimonyViewer.module.css';

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
    <ViewersContainer evidence={evidence}>
      <div className={testimonyViewer['testimony-modal-viewer']}>
        <div className={testimonyViewer['testimony-paper']}>
          
          <div className={testimonyViewer['testimony-header']}>
            <div className={testimonyViewer['testimony-agency']}>{agency}</div>
            <h2 className={testimonyViewer['testimony-title']}>{title}</h2>
            
            <div className={testimonyViewer['testimony-meta-grid']}>
              <div className={testimonyViewer['meta-box']}>
                <span className={testimonyViewer['meta-label']}>{t('pages.gameRoom.evidence.viewers.testimony.date')}</span>
                <span className={testimonyViewer['meta-value']}>{date}</span>
              </div>
              <div className={testimonyViewer['meta-box']}>
                <span className={testimonyViewer['meta-label']}>{t('pages.gameRoom.evidence.viewers.testimony.caseNo')}</span>
                <span className={testimonyViewer['meta-value']}>{case_number}</span>
              </div>
            </div>
          </div>

          <div className={testimonyViewer['testimony-subject-block']}>
            <div>
              <span className={testimonyViewer['subject-label']}>{t('pages.gameRoom.evidence.viewers.testimony.subject')}</span> 
              {subject_name}
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <span className={testimonyViewer['subject-label']}>{t('pages.gameRoom.evidence.viewers.testimony.interviewer')}</span> 
              {interviewer}
            </div>
          </div>

          {context && (
            <div className={testimonyViewer['testimony-context']}>
              {context}
            </div>
          )}

          <div className={testimonyViewer['transcript-container']}>
            <div className={testimonyViewer['transcript-watermark']}>
              {t('pages.gameRoom.evidence.viewers.testimony.watermark')}
            </div>
            
            <div className={testimonyViewer['transcript-content']}>
              {Array.isArray(transcript) ? (
                transcript.map((line: any, idx: number) => (
                  <div key={idx} className={`${testimonyViewer['transcript-line']}${line.type === 'q' ? testimonyViewer['transcript-q'] : testimonyViewer['transcript-a']}`}>
                    <span className={testimonyViewer['speaker-tag']}>{line.speaker}:</span>
                    {line.text}
                  </div>
                ))
              ) : (
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(transcript) }} />
              )}
            </div>
          </div>

          <div className={testimonyViewer['testimony-footer']}>
            <div className={testimonyViewer['certification-statement']}>
              {t('pages.gameRoom.evidence.viewers.testimony.certStatement')}
            </div>
            
            <div className={testimonyViewer['signature-area']}>
              <div className={testimonyViewer['steno-signature']}>
                <img 
                  src={getSignature(evidence.id)} 
                  alt="Stenographer Signature" 
                  className={testimonyViewer['steno-signature-img']} 
                />
              </div>
              <div className={testimonyViewer['signature-line']}>
                {t('pages.gameRoom.evidence.viewers.testimony.stenoSignature')}
              </div>
            </div>
          </div>

        </div>
      </div>
    </ViewersContainer>
  );
};

export default TestimonyViewer;