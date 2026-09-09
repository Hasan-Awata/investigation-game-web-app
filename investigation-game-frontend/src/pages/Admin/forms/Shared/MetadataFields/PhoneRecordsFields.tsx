import { useDynamicList } from '@/hooks/useDynamicList';
import { AdminRow, AdminInput, AdminSelect, DynamicListHeader, RemoveButton } from '@/pages/Admin/components/AdminUI';
import type { PhoneRecordsMetadata } from '@/types/evidence';
import type { MetadataFieldProps } from './types';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';

export default function PhoneRecordsFields({ metadata, updateMeta }: MetadataFieldProps<PhoneRecordsMetadata>) {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.evidenceMetadata.phoneRecords || {
    subscriberLabel: "Subscriber Name",
    phoneLabel: "Phone Number",
    carrierLabel: "Carrier / Network",
    periodLabel: "Statement Period",
    logsHeader: "Call & SMS Logs",
    addLogBtn: "+ Add Log Entry",
    timePlaceholder: "e.g., 2023-10-14 14:32",
    contactPlaceholder: "Contact Number",
    durationPlaceholder: "e.g., 04:12",
    typeIncoming: "Incoming",
    typeOutgoing: "Outgoing",
    typeMissed: "Missed",
    typeSms: "SMS",
    emptyLogsMsg: "No call logs added yet."
  };

  const { items: logs, add, update, remove } = useDynamicList<{timestamp: string, type: string, contact_number: string, duration: string}>(
    metadata.logs || [],
    (newLogs) => updateMeta('logs', newLogs)
  );

  return (
    <>
      <AdminRow>
        <AdminInput label={t.subscriberLabel} required value={metadata.subscriber_name || ''} onChange={e => updateMeta('subscriber_name', e.target.value)} />
        <AdminInput label={t.phoneLabel} required value={metadata.phone_number || ''} onChange={e => updateMeta('phone_number', e.target.value)} />
      </AdminRow>
      <AdminRow>
        <AdminInput label={t.carrierLabel} required value={metadata.carrier || ''} onChange={e => updateMeta('carrier', e.target.value)} />
        <AdminInput label={t.periodLabel} required value={metadata.statement_period || ''} onChange={e => updateMeta('statement_period', e.target.value)} />
      </AdminRow>

      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '4px', marginTop: '1.5rem', borderLeft: '3px solid var(--accent-cyan)' }}>
        <DynamicListHeader title={t.logsHeader} onAdd={() => add({ timestamp: '', type: 'incoming', contact_number: '', duration: '' })} addLabel={t.addLogBtn} />
        
        {logs.map((log, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '4px' }}>
            <div style={{ flex: 1 }}>
              <AdminInput value={log.timestamp} onChange={e => update(idx, 'timestamp', e.target.value)} placeholder={t.timePlaceholder} required />
            </div>
            <div style={{ width: '120px' }}>
              <AdminSelect value={log.type} onChange={e => update(idx, 'type', e.target.value)} 
                options={[
                  { value: 'incoming', label: t.typeIncoming },
                  { value: 'outgoing', label: t.typeOutgoing },
                  { value: 'missed', label: t.typeMissed },
                  { value: 'sms', label: t.typeSms }
                ]}
              />
            </div>
            <div style={{ flex: 1 }}>
              <AdminInput value={log.contact_number} onChange={e => update(idx, 'contact_number', e.target.value)} placeholder={t.contactPlaceholder} required />
            </div>
            <div style={{ width: '100px' }}>
              <AdminInput value={log.duration} onChange={e => update(idx, 'duration', e.target.value)} placeholder={t.durationPlaceholder} required />
            </div>
            <RemoveButton onClick={() => remove(idx)} />
          </div>
        ))}
        {logs.length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', marginTop: '0.5rem' }}>{t.emptyLogsMsg}</div>}
      </div>
    </>
  );
}