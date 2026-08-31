import React, { useState, useRef } from 'react'; // Removed bare FormEvent import
import { useAdminMutations, type AdminEntityType } from '@/hooks/useAdminMutations';
import { objectToFormData } from '@/utils/formUtils';

interface UseAdminFormProps<T> {
  entityType: AdminEntityType;
  initialState: T;
  basePayload?: Record<string, any>;
}

export function useAdminForm<T extends Record<string, any>>({ entityType, initialState, basePayload = {} }: UseAdminFormProps<T>) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<T>(initialState);
  
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { createEntity, updateEntity, deleteEntity, isProcessing, feedback, clearFeedback } = useAdminMutations(entityType);

  const updateField = (field: keyof T, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const clearForm = () => {
    setEditingId(null);
    setFormData(initialState);
    clearFeedback();
    Object.values(fileInputRefs.current).forEach(ref => { if (ref) ref.value = ''; });
  };

  const registerFileRef = (key: string) => (el: HTMLInputElement | null) => {
    fileInputRefs.current[key] = el;
  };

  // STRICT TYPING APPLIED HERE
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>, files: Record<string, File | null> = {}) => {
    e.preventDefault();
    clearFeedback();

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

  const handleEditInit = (entity: any, mappingFn?: (e: any) => T) => {
    clearFeedback();
    setEditingId(entity.id);
    setFormData(mappingFn ? mappingFn(entity) : { ...initialState, ...entity });
    
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
    handleEditInit, handleDelete, registerFileRef, isProcessing, feedback
  };
}