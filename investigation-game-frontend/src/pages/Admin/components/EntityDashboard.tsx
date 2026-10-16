import { type ReactNode } from 'react';
import AdminFormLayout from './AdminFormLayout';
import EntityList from '../forms/Shared/EntityList';
import adminForms from '../forms/Shared/AdminForms.module.css';

interface EntityDashboardProps<T> {
  entityName: string;
  listTitle: string;
  items: T[];
  editingId: number | string | null;
  isProcessing: boolean;
  contextHeader?: string;
  emptyMessage: string; 
  keyExtractor: (item: T) => string | number;
  onClear: () => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  onExport?: (item: T) => void;
  renderItemContent: (item: T) => ReactNode;
  children: ReactNode;
  contextMissing?: ReactNode;
  submitLabel?: { creating: string; editing: string; processing: string };
}

export default function EntityDashboard<T>({
  entityName, listTitle, items, editingId, isProcessing,
  contextHeader, emptyMessage, keyExtractor,
  onClear, onEdit, onDelete, onExport, renderItemContent, children,
  contextMissing,
  submitLabel
}: EntityDashboardProps<T>) {

  return (
    <div className={adminForms['admin-form-page']}>
      <AdminFormLayout
        editingId={editingId}
        entityName={entityName}
        contextHeader={contextHeader}
        onCancel={onClear}
        children={children}
        contextMissing={contextMissing}
        submitLabel={submitLabel}
        isProcessing={isProcessing}
      />

      <EntityList<T>
        title={listTitle}
        items={items}
        emptyMessage={emptyMessage}
        keyExtractor={keyExtractor}
        isProcessing={isProcessing}
        onEdit={onEdit}
        onDelete={onDelete}
        onExport={onExport}
        renderItemContent={renderItemContent}
      />
    </div>
  );
}