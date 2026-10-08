import React, { useState, useRef } from 'react';
import { useAdminMutations, type AdminEntityType } from '@/pages/Admin/hooks/useAdminMutations';
import { useAdminContext } from '@/pages/Admin/context/AdminContext.shared';
import { objectToFormData } from '@/pages/Admin/utils/formUtils';
import toast from 'react-hot-toast';

interface UseAdminFormProps<T> {
  entityType: AdminEntityType;
  initialState: T;
  basePayload?: Record<string, unknown>;
  validator?: (data: T) => string | null; // Returns error message or null if valid
}

export function useAdminForm<T extends Record<string, unknown>>({ entityType, initialState, basePayload = {}, validator }: UseAdminFormProps<T>) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<T>(initialState);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { createEntity, updateEntity, deleteEntity, importEntity, isProcessing } = useAdminMutations(entityType);
  const { setIsDirty } = useAdminContext();

  const updateField = (field: keyof T, value: T[keyof T] | unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const clearForm = () => {
    setEditingId(null);
    setFormData(initialState);
    setIsDirty(false);
    Object.values(fileInputRefs.current).forEach(ref => { if (ref) ref.value = ''; });
  };

  const registerFileRef = (key: string) => (el: HTMLInputElement | null) => {
    fileInputRefs.current[key] = el;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>, files: Record<string, File | null> = {}) => {
    e.preventDefault();

    if (validator) {
      const error = validator(formData);
      if (error) {
        toast.error(error);
        return;
      }
    }

    const payloadData = { ...basePayload, ...formData };
    const payload = objectToFormData(payloadData);

    Object.entries(files).forEach(([key, file]) => {
      if (file) payload.append(key, file);
    });

    if (editingId) {
      updateEntity({ id: editingId, formData: payload }, { onSuccess: clearForm });
    } else {
      createEntity(payload, { onSuccess: clearForm });
    }
  };

  const handleEditInit = <E extends { id: number }>(entity: E, mappingFn?: (e: E) => T) => {
    setEditingId(entity.id);
    setFormData(mappingFn ? mappingFn(entity) : { ...initialState, ...entity } as T);
    setIsDirty(false);

    Object.values(fileInputRefs.current).forEach(ref => { if (ref) ref.value = ''; });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: number, warningMessage: string) => {
    if (window.confirm(warningMessage)) {
      if (editingId === id) clearForm();
      deleteEntity(id);
    }
  };

  return {
    formData, setFormData, updateField, editingId, clearForm, handleSubmit,
    handleEditInit, handleDelete, registerFileRef, isProcessing, importEntity
  };
}