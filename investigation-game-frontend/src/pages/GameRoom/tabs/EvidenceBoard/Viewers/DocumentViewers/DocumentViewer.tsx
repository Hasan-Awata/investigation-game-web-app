import type { DocumentEvidence } from '@/types/evidence';
import './DocumentViewer.css'; 
import FinancialRecordViewer from './FinancialRecordViewer'; 
import ContractViewer from './ContractViewer';
import JournalViewer from './JournalViewer';

interface DocumentViewerProps {
  evidence: DocumentEvidence;
}

export default function DocumentViewer({ evidence }: DocumentViewerProps) {
  const { sub_type, metadata } = evidence;

  const renderDocumentContent = () => {
    switch (sub_type) {
      case 'correspondence':
        return (
          <div className="correspondence-preview-wrapper">
            <div className="correspondence-paper-sheet">
              <div className="correspondence-stamp">CONFIDENTIAL CORRESPONDENCE</div>
              
              <div className="correspondence-header-block">
                <div className="correspondence-row">
                  <span className="correspondence-label">TO:</span> 
                  <span className="correspondence-val">{metadata.recipient}</span>
                </div>
                <div className="correspondence-row">
                  <span className="correspondence-label">FROM:</span> 
                  <span className="correspondence-val">{metadata.sender}</span>
                </div>
                <div className="correspondence-row correspondence-subject-row">
                  <span className="correspondence-label">SUBJECT:</span> 
                  <span className="correspondence-val">{metadata.subject}</span>
                </div>
              </div>
              
              <div className="correspondence-body-text">
                {metadata.body}
              </div>

              <div className="correspondence-footer-stamp">
                <span>INTEL ACQUISITION DIVISION // SEC-4</span>
              </div>
            </div>
          </div>
        );

      case 'financial':{
        return <FinancialRecordViewer evidence={evidence} />;
      }

      case 'journal': {
        return <JournalViewer evidence={evidence} />;
      }

      case 'contract': {
        return <ContractViewer evidence={evidence} />;
      }

      case 'memo':
        return (
        <div className="document-preview memo-preview">
          <div className="notebook-holes"></div>
          <div className="crumpled-texture"></div>
          
          <div className="memo-content">
            <p className="memo-body-text">{metadata.context || evidence.description}</p>
          </div>
        </div>
      );

      case 'background_check': {
        const { 
          subject_name, dob, sex_age, aliases, last_known_address, 
          employment_financial, criminal_history, associates, investigator_notes 
        } = evidence.metadata;
        
        return (
          <div className="doc-preview bg-check-preview">
            <div className="bg-check-header">
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem', fontFamily: 'var(--font-mono)', color: '#555' }}>DEPARTMENT OF PUBLIC SAFETY - RECORDS DIVISION</div>
                <h2 className="bg-check-title">BACKGROUND INVESTIGATION</h2>
              </div>
              <div className="bg-check-barcode">*DPS-AUTH-REQ*</div>
            </div>

            <div className="bg-check-id-block">
              <img src={evidence.img_url || '/placeholder-mugshot.jpg'} alt="Subject Mugshot" className="bg-check-mugshot" />
              
              <div className="bg-check-data">
                <div className="bg-check-data-row">
                  <span className="bg-check-label">SUBJECT NAME:</span>
                  <span className="bg-check-value">{subject_name}</span>
                </div>
                <div className="bg-check-data-row">
                  <span className="bg-check-label">DOB:</span>
                  <span className="bg-check-value">{dob}</span>
                </div>
                <div className="bg-check-data-row">
                  <span className="bg-check-label">SEX / AGE:</span>
                  <span className="bg-check-value">{sex_age}</span>
                </div>
                <div className="bg-check-data-row">
                  <span className="bg-check-label">ALIASES:</span>
                  <span className="bg-check-value">"{aliases}"</span>
                </div>
                <div className="bg-check-data-row" style={{ borderBottom: 'none' }}>
                  <span className="bg-check-label">LAST KNOWN ADDRESS:</span>
                  <span className="bg-check-value" dangerouslySetInnerHTML={{ __html: last_known_address }} />
                </div>
              </div>
            </div>

            {employment_financial && (
              <div className="bg-check-section">
                <div className="bg-check-section-title">Employment & Financial Profile</div>
                <div className="bg-check-text" dangerouslySetInnerHTML={{ __html: employment_financial }} />
              </div>
            )}

            {criminal_history && (
              <div className="bg-check-section">
                <div className="bg-check-section-title">Criminal History & Warrants</div>
                <div className="bg-check-text" dangerouslySetInnerHTML={{ __html: criminal_history }} />
              </div>
            )}

            {associates && (
              <div className="bg-check-section">
                <div className="bg-check-section-title">Known Associates</div>
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
      }

        default:
        return <div className="doc-body">Document contents illegible or corrupted.</div>;
    }
  };

  return (
    <div className="document-report-container">
      {renderDocumentContent()}
    </div>
  );
}