import { type ReactNode } from 'react';
import { useAdminTranslation } from '../hooks/useAdminTranslation';

interface AdminFormLayoutProps {
  editingId: number | string | null;
  entityName: string;
  contextHeader?: string;
  onCancel?: () => void;
  children: ReactNode;
  contextMissing?: ReactNode;
  submitLabel?: { creating: string; editing: string; processing: string };
  isProcessing?: boolean;
}

export default function AdminFormLayout({ 
  editingId, 
  entityName, 
  contextHeader, 
  onCancel, 
  children, 
  contextMissing,
  submitLabel,
  isProcessing = false 
}: AdminFormLayoutProps) {
  const { adminT } = useAdminTranslation();
  const t = adminT.component.adminFormLayout as Record<string, string>;

  const defaultLabels = {
    creating: t.commitEntity ?? `Create ${entityName}`,
    editing: t.updateEntity ?? `Update ${entityName}`,
    processing: t.processingData ?? 'Processing...'
  };

  const labels = submitLabel || defaultLabels;
  const submitText = isProcessing ? labels.processing : (editingId ? labels.editing : labels.creating);

  if (contextMissing) {
    return (
      <div className="admin-form-wrapper glass-panel">
        {contextMissing}
      </div>
    );
  }

  return (
    <div className="admin-form-wrapper glass-panel">
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-mono)', color: editingId ? 'var(--accent-amber)' : 'var(--accent-cyan)', margin: '0 0 0.5rem 0' }}>
              {editingId ? `${t.editingPrefix} ${entityName} ${t.idLabel}: ${editingId}` : `${t.initializingPrefix} ${entityName}`}
            </h3>
            {contextHeader && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {contextHeader}
              </span>
            )}
          </div>
          {editingId && onCancel && (
            <button type="button" className="btn-secondary" onClick={onCancel} style={{ padding: '0.5rem 1rem', width: 'auto' }}>
              {t.cancelEdit}
            </button>
          )}
        </div>
        {children}
        <button type="submit" className={`btn-primary ${editingId ? 'editing' : 'creating'}`} style={{ marginTop: '1.5rem', width: '100%' }}>
          {submitText}
        </button>
      </div>
    </div>
  );
}