import React from 'react';
import { useTranslation } from 'react-i18next';
import type { DocumentEvidence } from '@/types/evidence';
import type { PhoneCallLog } from '@/types/evidence/document';
import './PhoneRecordsViewer.css';

type PhoneRecordsEvidence = Extract<DocumentEvidence, { sub_type: 'phone_records' }>;

interface PhoneRecordsViewerProps {
  evidence: PhoneRecordsEvidence;
}

const PhoneRecordsViewer: React.FC<PhoneRecordsViewerProps> = ({ evidence }) => {
  const { t } = useTranslation();
  const { subscriber_name, phone_number, carrier, statement_period, logs } = evidence.metadata;

  const renderLogType = (type: string) => {
    const normalizedType = type.toLowerCase();
    
    switch (normalizedType) {
      case 'incoming':
        return (
          <span className="telecom-type-badge type-incoming">
            <span className="telecom-icon">↙</span> {t('pages.gameRoom.evidence.viewers.phoneRecords.incoming', 'INCOMING')}
          </span>
        );
      case 'outgoing':
        return (
          <span className="telecom-type-badge type-outgoing">
            <span className="telecom-icon">↗</span> {t('pages.gameRoom.evidence.viewers.phoneRecords.outgoing', 'OUTGOING')}
          </span>
        );
      case 'missed':
        return (
          <span className="telecom-type-badge type-missed">
            <span className="telecom-icon">×</span> {t('pages.gameRoom.evidence.viewers.phoneRecords.missed', 'MISSED')}
          </span>
        );
      case 'sms':
        return (
          <span className="telecom-type-badge type-sms">
            <span className="telecom-icon">✉</span> {t('pages.gameRoom.evidence.viewers.phoneRecords.sms', 'SMS')}
          </span>
        );
      default:
        return <span className="telecom-type-badge">{type.toUpperCase()}</span>;
    }
  };

  return (
    <div className="doc-preview phone-records-preview-wrapper">
      
      <div className="telecom-bill-header">
        <h2 className="telecom-carrier-name">{carrier || t('pages.gameRoom.evidence.viewers.phoneRecords.networkProvider', 'NETWORK PROVIDER')}</h2>
        <div className="telecom-barcode">*{evidence.id}*</div>
      </div>

      <div className="telecom-info-section">
        <div className="telecom-subscriber-details">
          <span className="telecom-label">
            {t('pages.gameRoom.evidence.viewers.phoneRecords.subscriber', 'Subscriber')}
          </span>
          <span className="telecom-value">{subscriber_name}</span>
          
          <span className="telecom-label spaced">
            {t('pages.gameRoom.evidence.viewers.phoneRecords.assignedNumber', 'Assigned Number')}
          </span>
          <span className="telecom-value mono-val">{phone_number}</span>
        </div>

        <div className="telecom-statement-details">
          <span className="telecom-label">
            {t('pages.gameRoom.evidence.viewers.phoneRecords.statementPeriod', 'Statement Period')}
          </span>
          <span className="telecom-value">{statement_period}</span>
          
          <span className="telecom-label spaced">
            {t('pages.gameRoom.evidence.viewers.phoneRecords.docRef', 'Document Ref')}
          </span>
          <span className="telecom-value mono-val">EX-{evidence.id.toString().padStart(3, '0')}</span>
        </div>
      </div>

      <div className="telecom-logs-section">
        <div className="telecom-section-title">
          {t('pages.gameRoom.evidence.viewers.phoneRecords.logsHeader', 'Itemized Call & Message Logs')}
        </div>

        <table className="telecom-logs-table">
          <thead>
            <tr>
              <th>{t('pages.gameRoom.evidence.variants.document.time', 'TIME')}</th>
              <th>{t('pages.gameRoom.evidence.variants.document.type', 'TYPE')}</th>
              <th>{t('pages.gameRoom.evidence.variants.document.contact', 'DESTINATION / ORIGIN')}</th>
              <th>{t('pages.gameRoom.evidence.variants.document.duration', 'DURATION')}</th>
            </tr>
          </thead>
          <tbody>
            {logs && logs.length > 0 ? (
              logs.map((log: PhoneCallLog, idx: number) => (
                <tr key={idx}>
                  <td>{log.timestamp}</td>
                  <td>{renderLogType(log.type)}</td>
                  <td>{log.contact_number}</td>
                  <td>{log.duration}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="telecom-empty-row">
                  {t('pages.gameRoom.evidence.variants.document.noLogs', 'No communication records found for this period.')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="telecom-footer">
        {t('pages.gameRoom.evidence.viewers.phoneRecords.endOfRecord', '*** END OF OFFICIAL TELECOM RECORD ***')}
      </div>

    </div>
  );
};

export default PhoneRecordsViewer;