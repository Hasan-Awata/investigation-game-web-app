import { type ReactNode } from 'react';

interface EntityListProps<T> {
  title: string;
  items: T[];
  emptyMessage?: string;
  keyExtractor: (item: T) => string | number;
  renderItemContent: (item: T) => ReactNode;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  isProcessing: boolean;
}

export default function EntityList<T>({
  title,
  items,
  emptyMessage = 'No items found.',
  keyExtractor,
  renderItemContent,
  onEdit,
  onDelete,
  isProcessing
}: EntityListProps<T>) {
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
      <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', marginBottom: '1.5rem' }}>
        // {title}
      </h3>
      
      {items.length === 0 ? (
        <div className="terminal-text" style={{ padding: 0, textAlign: 'left', color: 'var(--text-secondary)' }}>
          {emptyMessage}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map((item) => (
            <div 
              key={keyExtractor(item)} 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div style={{ overflow: 'hidden' }}>
                {renderItemContent(item)}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flex: 'none', marginLeft: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => onEdit(item)} 
                  disabled={isProcessing} 
                  style={{ background: 'transparent', border: '1px solid var(--accent-amber)', color: 'var(--accent-amber)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
                >
                  Edit
                </button>
                <button 
                  type="button" 
                  onClick={() => onDelete(item)} 
                  disabled={isProcessing} 
                  style={{ background: 'transparent', border: '1px solid var(--accent-crimson)', color: 'var(--accent-crimson)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}