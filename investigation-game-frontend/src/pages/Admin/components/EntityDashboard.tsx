import { type ReactNode } from 'react';
import AdminFormLayout from './AdminFormLayout';
import EntityList from '../forms/Shared/EntityList';

interface EntityDashboardProps<T> {
  entityName: string;
  listTitle: string;
  items: T[];
  editingId: number | string | null;
  isProcessing: boolean;
  isFetching?: boolean;
  contextHeader?: string;
  emptyMessage: string; 
  keyExtractor: (item: T) => string | number;
  onClear: () => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  renderItemContent: (item: T) => ReactNode;
  children: ReactNode;
}

export default function EntityDashboard<T>({
  entityName, listTitle, items, editingId, isProcessing,
  contextHeader, emptyMessage, keyExtractor,
  onClear, onEdit, onDelete, renderItemContent, children
}: EntityDashboardProps<T>) {

  return (
    <div className="admin-form-page">
      <AdminFormLayout
        editingId={editingId}
        entityName={entityName}
        contextHeader={contextHeader}
        onCancel={onClear}
      >
        {children}
      </AdminFormLayout>

      <EntityList<T>
        title={listTitle}
        items={items}
        emptyMessage={emptyMessage}
        keyExtractor={keyExtractor}
        isProcessing={isProcessing}
        onEdit={onEdit}
        onDelete={onDelete}
        renderItemContent={renderItemContent}
      />
    </div>
  );
}