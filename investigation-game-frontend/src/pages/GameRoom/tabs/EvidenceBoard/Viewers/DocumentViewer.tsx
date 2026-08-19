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
          <>
            <div className="doc-header-block">
              <div className="doc-meta-row"><span className="doc-meta-label">TO:</span> <span>{metadata.recipient}</span></div>
              <div className="doc-meta-row"><span className="doc-meta-label">FROM:</span> <span>{metadata.sender}</span></div>
              <div className="doc-meta-row"><span className="doc-meta-label">SUBJECT:</span> <span>{metadata.subject}</span></div>
            </div>
            <div className="doc-body">{metadata.body}</div>
          </>
        );

      case 'financial':
        return (
          <>
            <div className="doc-header-block">
              <h2 style={{ margin: 0, textTransform: 'uppercase' }}>{metadata.institution}</h2>
              <div className="doc-meta-row" style={{ marginTop: '1rem' }}>
                <span className="doc-meta-label">ACCOUNT:</span> <span>{metadata.account_holder}</span>
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
          </>
        );

      case 'journal':
        return (
          <>
            <div className="doc-header-block" style={{ borderBottomStyle: 'dashed' }}>
              <div className="doc-meta-row"><span className="doc-meta-label">AUTHOR:</span> <span>{metadata.author}</span></div>
              <div className="doc-meta-row"><span className="doc-meta-label">DATE:</span> <span>{metadata.entry_date}</span></div>
            </div>
            <div className="doc-body" style={{ fontStyle: 'italic' }}>{metadata.content}</div>
          </>
        );

      case 'contract':
        return (
          <>
            <div className="doc-header-block">
              <h2 style={{ margin: 0, textAlign: 'center', textDecoration: 'underline' }}>LEGAL AGREEMENT</h2>
            </div>
            <div className="doc-body">
              <p><strong>PARTIES INVOLVED:</strong></p>
              <ul>
                {metadata.parties_involved.map((party, idx) => (
                  <li key={idx}>{party}</li>
                ))}
              </ul>
              <p><strong>TERMS OF AGREEMENT:</strong></p>
              <p>{metadata.agreement_terms}</p>
            </div>
            <div style={{ marginTop: '3rem', borderTop: '1px solid #1a1a1a', paddingTop: '1rem', textAlign: 'right' }}>
              <strong>SIGNATURES VERIFIED:</strong> {metadata.signatures_valid ? 'YES' : 'NO / FORGED'}
            </div>
          </>
        );

      case 'memo':
        return (
          <>
            <div className="doc-header-block">
              <div className="doc-meta-row"><span className="doc-meta-label">MEMO FROM:</span> <span>{metadata.written_by}</span></div>
            </div>
            <div className="doc-body">{metadata.context}</div>
          </>
        );

      case 'background_check':
        return (
          <>
            <div className="doc-header-block" style={{ borderBottom: '3px solid #1a1a1a' }}>
              <h2 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>BACKGROUND INVESTIGATION</h2>
              <div style={{ marginTop: '1.5rem' }}>
                <div className="doc-meta-row"><span className="doc-meta-label">SUBJECT:</span> <span>{metadata.subject_name}</span></div>
                <div className="doc-meta-row"><span className="doc-meta-label">DOB:</span> <span>{metadata.dob}</span></div>
              </div>
            </div>
            
            <div className="doc-body">
              <p style={{ fontWeight: 'bold', textDecoration: 'underline' }}>CRIMINAL RECORD & FLAGS</p>
              <p style={{ fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.05)', padding: '1rem', borderLeft: '3px solid #1a1a1a' }}>
                {metadata.criminal_record}
              </p>
              
              {metadata.investigator_notes && (
                <>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginTop: '2rem' }}>INVESTIGATOR NOTES</p>
                  <p style={{ fontStyle: 'italic' }}>{metadata.investigator_notes}</p>
                </>
              )}
            </div>
          </>
        );

        default:
        return <div className="doc-body">Document contents illegible or corrupted.</div>;
    }
  };

  return (
    <div className="document-report-container">
      <div className="stamp-confidential">CONFIDENTIAL</div>
      {renderDocumentContent()}
    </div>
  );
}