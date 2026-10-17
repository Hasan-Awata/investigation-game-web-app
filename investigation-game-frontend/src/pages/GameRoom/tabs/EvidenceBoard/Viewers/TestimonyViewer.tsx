import React from 'react';
import { useTranslation } from 'react-i18next';
import { sanitizeHtml } from '@/utils/sanitize';
import type { TestimonyEvidence } from '@/types/evidence'; 
import ViewersContainer from './ViewersContainer';
import { signatureUrl } from '@/pages/GameRoom/tabs/EvidenceBoard/DocViewer/blocks/signatureAsset';
import testimonyViewer from './TestimonyViewer.module.css';

interface TestimonyViewerProps {
  evidence: TestimonyEvidence;
}

const TestimonyViewer: React.FC<TestimonyViewerProps> = ({ evidence }) => {
  const { t } = useTranslation();
  
  const {
    agency,
    title,
    date,
    case_number,
    subject_name,
    subject,
    interviewer,
    context,
    transcript = []
  } = evidence.metadata || {};

  const displayAgency = agency || t('pages.gameRoom.evidence.viewers.testimony.policeDept');
  const displayTitle = title || t('pages.gameRoom.evidence.viewers.testimony.officialTranscript');
  const displayDate = date || new Date().toLocaleDateString();
  const displayCaseNumber = case_number || `EX-${evidence.id.toString().padStart(3, '0')}`;
  const displaySubject = subject || subject_name || t('pages.gameRoom.evidence.viewers.testimony.subjectFallback');
  const displayInterviewer = interviewer || t('pages.gameRoom.evidence.viewers.testimony.interviewerFallback');

  return (
    <ViewersContainer>
      <div className={testimonyViewer['testimony-modal-viewer']}>
        <div className={testimonyViewer['testimony-paper']}>
          
          <div className={testimonyViewer['testimony-header']}>
            <div className={testimonyViewer['testimony-agency']}>{displayAgency}</div>
            <h2 className={testimonyViewer['testimony-title']}>{displayTitle}</h2>
            
            <div className={testimonyViewer['testimony-meta-grid']}>
              <div className={testimonyViewer['meta-box']}>
                <span className={testimonyViewer['meta-label']}>{t('pages.gameRoom.evidence.viewers.testimony.date')}</span>
                <span className={testimonyViewer['meta-value']}>{displayDate}</span>
              </div>
              <div className={testimonyViewer['meta-box']}>
                <span className={testimonyViewer['meta-label']}>{t('pages.gameRoom.evidence.viewers.testimony.caseNo')}</span>
                <span className={testimonyViewer['meta-value']}>{displayCaseNumber}</span>
              </div>
            </div>
          </div>

          <div className={testimonyViewer['testimony-subject-block']}>
            <div>
              <span className={testimonyViewer['subject-label']}>{t('pages.gameRoom.evidence.viewers.testimony.subject')}</span> 
              {displaySubject}
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <span className={testimonyViewer['subject-label']}>{t('pages.gameRoom.evidence.viewers.testimony.interviewer')}</span> 
              {displayInterviewer}
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
                transcript.map((line: { speaker: string; text: string; type?: string }, idx: number) => (
                  <div key={idx} 
                    className={`${testimonyViewer['transcript-line']} ${line.type === 'q' ? testimonyViewer['transcript-q'] : testimonyViewer['transcript-a']}`}>
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
                  src={signatureUrl(evidence.id % 19)} 
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
