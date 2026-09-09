import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types';
import type { DocumentEvidence as DocEvType, PhoneRecordsMetadata } from '@/types/evidence';
import './PhoneRecordsVariant.css';

export default function PhoneRecordsVariant({ evidence }: { evidence: Evidence }) {
  const { t } = useTranslation();
  
  // Safely cast and extract metadata
  const phoneEvidence = evidence as Extract<DocEvType, { sub_type: 'phone_records' }>;
  const metadata: PhoneRecordsMetadata | undefined = phoneEvidence.metadata;

  // Helper to render a tiny icon based on call direction
  const renderDirectionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'incoming': return <span className="dir-icon dir-in">↙</span>;
      case 'outgoing': return <span className="dir-icon dir-out">↗</span>;
      case 'missed': return <span className="dir-icon dir-miss">×</span>;
      case 'sms': return <span className="dir-icon">✉</span>;
      default: return <span className="dir-icon">-</span>;
    }
  };

  return (
    <div className="document-variant phone-records-variant">
      
      {/* 1. Telecom Header */}
      <div className="telecom-header">
        <span className="telecom-logo-placeholder">
          {metadata?.carrier || 'TELECOM CORP'}
        </span>
        <span className="telecom-period">
          {metadata?.statement_period || 'BILLING CYCLE'}
        </span>
      </div>

      {/* 2. Account Information */}
      <div className="telecom-account-info">
        <div className="account-details">
          <span className="subscriber-name">{metadata?.subscriber_name || 'UNKNOWN SUBSCRIBER'}</span>
          <span className="subscriber-number">{metadata?.phone_number || 'UNKNOWN NUMBER'}</span>
        </div>
      </div>

      {/* 3. Call Logs & Description */}
      <div className="telecom-logs-container">

        <table className="call-log-table">
          <thead>
            <tr>
              <th>{t('pages.gameRoom.evidence.variants.document.time', 'TIME')}</th>
              <th>{t('pages.gameRoom.evidence.variants.document.type', 'TYP')}</th>
              <th>{t('pages.gameRoom.evidence.variants.document.contact', 'CONTACT')}</th>
              <th>{t('pages.gameRoom.evidence.variants.document.duration', 'DUR')}</th>
            </tr>
          </thead>
          <tbody>
            {metadata?.logs && metadata.logs.length > 0 ? (
              // Limit to 5 logs so the UI doesn't stretch endlessly
              metadata.logs.slice(0, 5).map((log, index) => (
                <tr key={index}>
                  <td>{log.timestamp}</td>
                  <td>{renderDirectionIcon(log.type)}</td>
                  <td>{log.contact_number}</td>
                  <td>{log.duration}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af' }}>
                  {t('pages.gameRoom.evidence.variants.document.noLogs', 'No call data available')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}