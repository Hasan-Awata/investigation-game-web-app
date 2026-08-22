import type { DocumentEvidence } from '@/types/evidence';
import './DocumentViewer.css'; // Assuming you named the CSS file this

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

      case 'financial':
        return (
          <div className="financial-preview-wrapper">
            {/* The giant faint watermark behind the text */}
            <div className="financial-watermark">CONFIDENTIAL</div>
            
            {/* The red rubber stamp */}
            <div className="financial-stamp">SUBPOENAED RECORD</div>

            <div className="doc-header-block">
              <div className="financial-header-top">
                <h2 style={{ margin: 0, textTransform: 'uppercase' }}>{metadata.institution}</h2>
                <div className="financial-barcode">*{evidence.id}*</div>
              </div>
              <div className="doc-meta-row" style={{ marginTop: '1rem', display: 'flex', gap: '3rem' }}>
                <div><span className="doc-meta-label">ACCOUNT:</span> <span>{metadata.account_holder}</span></div>
                <div><span className="doc-meta-label">DOC REF:</span> <span>EX-{evidence.id.toString().padStart(3, '0')}</span></div>
              </div>
            </div>
            
            <table className="financial-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction Detail</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(metadata.transactions || []).map((tx: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{tx.date}</td>
                    <td>{tx.type}</td>
                    <td style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{tx.amount}</td>
                    <td>{tx.status}</td>
                  </tr>
                ))}
                {(!metadata.transactions || metadata.transactions.length === 0) && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', fontStyle: 'italic', color: '#666' }}>
                      No ledger data available on record.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="financial-footer">
              <span>AUTHORIZED BY DEPT OF TREASURY</span>
              <span>PAGE 1 OF 1</span>
            </div>
          </div>
        );

      case 'journal': {
        const { author, entry_date, content } = evidence.metadata;
        return (
          <div className="doc-preview journal-diary-preview">
            <div className="journal-spine-shadow"></div>
            
            <div className="journal-header">
              <div className="journal-meta-box">
                <div><span className="journal-label">AUTHOR:</span> {author}</div>
                <div><span className="journal-label">DATE:</span> {entry_date}</div>
              </div>
              <div className="journal-tag">PERSONAL DIARY ENTRY</div>
            </div>

            <div className="journal-diary-body">
              {content}
            </div>
          </div>
        );
      }

      case 'contract': {
        const { parties_involved, agreement_terms, signatures_valid } = evidence.metadata;
        
        // Explicitly point to your Laravel backend URL (matches how your main.tsx connects to Echo)
        const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        
        // Real autographic handwritten signature PNG assets hosted on the Laravel backend 
          const signaturePool = [
            `${backendUrl}/assets/signatures/signature.svg`,
            `${backendUrl}/assets/signatures/signature-1.svg`,
            `${backendUrl}/assets/signatures/signature-2.svg`,
            `${backendUrl}/assets/signatures/signature-3.svg`,
            `${backendUrl}/assets/signatures/signature-4.svg`,
            `${backendUrl}/assets/signatures/signature-5.svg`,
            `${backendUrl}/assets/signatures/signature-6.svg`,
            `${backendUrl}/assets/signatures/signature-7.svg`,
            `${backendUrl}/assets/signatures/signature-8.svg`,
            `${backendUrl}/assets/signatures/signature-9.svg`,
            `${backendUrl}/assets/signatures/signature-10.svg`,
            `${backendUrl}/assets/signatures/signature-11.svg`,
            `${backendUrl}/assets/signatures/signature-12.svg`,
            `${backendUrl}/assets/signatures/signature-13.svg`,
            `${backendUrl}/assets/signatures/signature-14.svg`,
            `${backendUrl}/assets/signatures/signature-15.svg`,
            `${backendUrl}/assets/signatures/signature-16.svg`,
            `${backendUrl}/assets/signatures/signature-17.svg`,
            `${backendUrl}/assets/signatures/signature-18.svg`,
          ];

        // Deterministically select two DIFFERENT signatures with absolute safety check
        const idx1 = evidence.id % signaturePool.length;
        let idx2 = (evidence.id + 2) % signaturePool.length;
        if (idx1 === idx2) {
          idx2 = (idx1 + 1) % signaturePool.length;
        }
        
        const sig1 = signaturePool[idx1];
        const sig2 = signaturePool[idx2];

        return (
          <div className="doc-preview contract-legal-preview">
            <div className="contract-watermark">BINDING AGREEMENT</div>
            
            <div className="contract-header">
              <h2 className="contract-title">DEED OF AGREEMENT</h2>
              <div className="contract-subtitle">OFFICIAL LEGAL INSTRUMENT // NOTARY VERIFIED</div>
            </div>

            <div className="contract-section">
              <span className="contract-label">BETWEEN THE PARTIES:</span>
              <ul className="contract-parties-list">
                {(parties_involved || []).map((party: string, idx: number) => (
                  <li key={idx}><strong>Party {idx + 1}:</strong> {party}</li>
                ))}
              </ul>
            </div>

            <div className="contract-section">
              <span className="contract-label">TERMS AND CONDITIONS:</span>
              <div className="contract-terms-text">
                {agreement_terms}
              </div>
            </div>

            <div className="contract-signature-block">
              <div className="signature-col">
                <div className="signature-line-wrapper">
                  <img src={sig1} alt="Authorized Signature" className="rendered-signature-img" />
                  <div className="contract-signature-line"></div>
                </div>
                <span className="signature-caption">Authorized Representative</span>
              </div>
              <div className="signature-col">
                <div className="signature-line-wrapper">
                  <img src={sig2} alt="Witness Signature" className="rendered-signature-img" />
                  <div className="contract-signature-line"></div>
                </div>
                <span className="signature-caption">Second Party / Witness</span>
              </div>
            </div>

            <div className={`contract-validation-stamp ${signatures_valid ? 'valid' : 'forged'}`}>
              {signatures_valid ? 'VERIFIED // NOTARIZED' : 'FLAGGED // FRAUDULENT'}
            </div>
          </div>
        );
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