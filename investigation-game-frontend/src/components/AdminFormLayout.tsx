import { type ReactNode } from 'react';

interface AdminFormLayoutProps {
  editingId: number | string | null;
  entityName: string;
  contextHeader?: string;
  feedback?: { type: 'success' | 'error'; message: string } | null;
  onCancel?: () => void;
  children: ReactNode;
}

export default function AdminFormLayout({ editingId, entityName, contextHeader, feedback, onCancel, children }: AdminFormLayoutProps) {
  return (
    <div className="admin-form-wrapper glass-panel">
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-mono)', color: editingId ? 'var(--accent-amber)' : 'var(--accent-cyan)', margin: '0 0 0.5rem 0' }}>
              {editingId ? `// Editing ${entityName} ID: ${editingId}` : `// Initialize New ${entityName}`}
            </h3>
            {contextHeader && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {contextHeader}
              </span>
            )}
          </div>
          {editingId && onCancel && (
            <button type="button" className="btn-secondary" onClick={onCancel} style={{ padding: '0.5rem 1rem', width: 'auto' }}>
              Cancel Edit
            </button>
          )}
        </div>

        {feedback && (
          <div className={`status-message ${feedback.type}`} style={{ margin: '0.5rem 0 1.5rem 0', fontSize: '0.85rem' }}>
            {feedback.message}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}