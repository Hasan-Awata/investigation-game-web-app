import { type ReactNode } from 'react';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import adminForms from './AdminForms.module.css';

interface EntityListProps<T> {
  title: string;
  items: T[];
  emptyMessage?: string;
  keyExtractor: (item: T) => string | number;
  renderItemContent: (item: T) => ReactNode;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  onExport?: (item: T) => void;
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
  onExport,
  isProcessing
}: EntityListProps<T>) {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.entityList;

  return (
    <div className={adminForms['admin-entity-list-container']}>
      <h3 className={adminForms['admin-entity-list-title']}>
        {title}
      </h3>
      
      {items.length === 0 ? (
        <div className={`terminal-text ${adminForms['admin-missing-context']}`} style={{ padding: 0, textAlign: 'left' }}>
          {emptyMessage}
        </div>
      ) : (
        <div className={adminForms['admin-entity-stack']}>
          {items.map((item) => (
            <div key={keyExtractor(item)} className={adminForms['admin-entity-row']}>
              <div className={adminForms['admin-entity-content']}>
                {renderItemContent(item)}
              </div>
              <div className={adminForms['admin-entity-actions']}>
                {onExport && (
                  <button 
                    type="button" 
                    onClick={() => onExport(item)} 
                    disabled={isProcessing} 
                    className={`${adminForms['admin-action-btn']} ${adminForms['export']}`}
                  >
                    {t.exportBtn}
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => onEdit(item)} 
                  disabled={isProcessing} 
                  className={`${adminForms['admin-action-btn']} ${adminForms['edit']}`}
                >
                  {t.editBtn}
                </button>
                <button 
                  type="button" 
                  onClick={() => onDelete(item)} 
                  disabled={isProcessing} 
                  className={`${adminForms['admin-action-btn']} ${adminForms['delete']}`}
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