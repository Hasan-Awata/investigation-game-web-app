import { type ReactNode } from 'react';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import './AdminForms.css';

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
  const { adminT } = useAdminTranslation();
  // Fallback safe reference if key isn't added yet, or standard lookup:
  const t = adminT.forms.entityList || { editBtn: 'Edit', deleteBtn: 'Delete' };

  return (
    <div className="admin-entity-list-container">
      <h3 className="admin-entity-list-title">
        // {title}
      </h3>
      
      {items.length === 0 ? (
        <div className="terminal-text admin-missing-context" style={{ padding: 0, textAlign: 'left' }}>
          {emptyMessage}
        </div>
      ) : (
        <div className="admin-entity-stack">
          {items.map((item) => (
            <div key={keyExtractor(item)} className="admin-entity-row">
              <div className="admin-entity-content">
                {renderItemContent(item)}
              </div>
              <div className="admin-entity-actions">
                <button 
                  type="button" 
                  onClick={() => onEdit(item)} 
                  disabled={isProcessing} 
                  className="admin-action-btn edit"
                >
                  {t.editBtn}
                </button>
                <button 
                  type="button" 
                  onClick={() => onDelete(item)} 
                  disabled={isProcessing} 
                  className="admin-action-btn delete"
                >
                  {t.deleteBtn}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}