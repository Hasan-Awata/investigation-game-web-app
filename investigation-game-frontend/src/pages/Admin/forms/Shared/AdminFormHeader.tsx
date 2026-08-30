interface AdminFormHeaderProps {
  editingId: number | string | null;
  entityName: string;
  contextHeader?: string;
  onCancel?: () => void;
}

export default function AdminFormHeader({ editingId, entityName, contextHeader, onCancel }: AdminFormHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: editingId ? 'var(--accent-amber)' : 'var(--accent-cyan)', margin: '0 0 0.5rem 0' }}>
          {editingId ? `// Editing ${entityName} ID: ${editingId}` : `// Compile New ${entityName}`}
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
  );
}