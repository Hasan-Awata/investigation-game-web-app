import React, { useState, useRef } from 'react';
import { useAdminMutations, type AdminEntityType } from '@/pages/Admin/hooks/useAdminMutations';
import { useAdminContext } from '@/pages/Admin/context/AdminContext.shared';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import { serializeFormData } from '@/pages/Admin/utils/serializeFormData';
import { buildNodeFormData } from '@/pages/Admin/utils/questionUtils';
import { useConfirm } from '@/pages/Admin/components/AdminUI/ConfirmContext';
import type { Question, Choice } from '@/types';
import type { DraftChoice } from '@/pages/Admin/forms/Shared/ChoiceEditorCard';
import toast from 'react-hot-toast';

interface UseAdminFormProps<T> {
  entityType: AdminEntityType;
  initialState: T;
  basePayload?: Record<string, unknown>;
  validator?: (data: T) => string | null; // Returns error message or null if valid
  buildFormData?: (payloadData: Record<string, unknown>, files: Record<string, File | null>) => FormData;
}

export function useAdminForm<T extends Record<string, unknown>>({
  entityType, initialState, basePayload = {}, validator, buildFormData
}: UseAdminFormProps<T>) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<T>(initialState);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { createEntity, updateEntity, deleteEntity, isProcessing } = useAdminMutations(entityType);
  const { setIsDirty } = useAdminContext();
  const confirm = useConfirm();

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

    let payload: FormData;
    if (buildFormData) {
      payload = buildFormData(payloadData, files);
    } else {
      payload = serializeFormData(payloadData);
      Object.entries(files).forEach(([key, file]) => {
        if (file) payload.append(key, file);
      });
    }

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

  const handleDelete = async (id: number, warningMessage: string) => {
    if (await confirm({ message: warningMessage, danger: true })) {
      if (editingId === id) clearForm();
      deleteEntity(id);
    }
  };

  return {
    formData, setFormData, updateField, editingId, clearForm, handleSubmit,
    handleEditInit, handleDelete, registerFileRef, isProcessing
  };
}

type NodeFormState = {
  text: string;
  store_locally: boolean;
  choices: DraftChoice[];
};

/**
 * Question-node state on top of {@link useAdminForm}: the location, wiretap and
 * interrogation builders all edit a node (text + choices) inside the currently
 * selected level, and share the same dirty-tracking / file-refs / edit+submit+
 * delete plumbing as every other admin form.
 */
export function useNodeForm(defaultChoices: DraftChoice[] = []) {
  const {
    setCaseId, setZoneId, setLevelId, selectedCase, selectedZone, selectedLevel, levelId
  } = useAdminContext();
  const { adminT } = useAdminTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const form = useAdminForm<NodeFormState>({
    entityType: 'question',
    initialState: { text: '', store_locally: false, choices: defaultChoices },
    basePayload: { level_id: levelId },
    buildFormData: (data, files) => buildNodeFormData({
      level_id: String(data.level_id ?? ''),
      text: String(data.text ?? ''),
      store_locally: Boolean(data.store_locally),
      choices: (data.choices as DraftChoice[] | undefined) ?? [],
      image: files.image ?? null,
      audio: files.audio ?? null,
    }),
    validator: (data) => {
      if (!data.text.trim()) return 'Node text cannot be empty.';
      if (data.choices.length > 0 && data.choices.some(c => !c.text.trim())) {
        return 'All response branches/choices must have text.';
      }
      return null;
    },
  });

  const clearForm = () => {
    setIsFormOpen(false);
    form.clearForm();
  };

  const handleEdit = (node: Question) => {
    // Restore parent context pointers so nested uploads resolve correctly.
    if (selectedCase) setCaseId(selectedCase.id.toString());
    if (selectedZone) setZoneId(selectedZone.id.toString());
    if (selectedLevel) setLevelId(selectedLevel.id.toString());

    setIsFormOpen(true);
    form.handleEditInit(node, (n) => ({
      text: n.text || '',
      store_locally: false,
      choices: n.choices && n.choices.length > 0
        ? n.choices.map((c: Choice) => ({
            id: c.id, text: c.text, requirements: c.requirements || {}, outcomes: c.outcomes || {}
          }))
        : defaultChoices,
    }));
  };

  return {
    state: {
      editingId: form.editingId,
      isFormOpen,
      text: form.formData.text,
      storeLocally: form.formData.store_locally,
      choices: form.formData.choices,
    },
    setters: {
      setIsFormOpen,
      setText: (text: string) => form.updateField('text', text),
      setStoreLocally: (storeLocally: boolean) => form.updateField('store_locally', storeLocally),
      setChoices: (choices: DraftChoice[]) => form.updateField('choices', choices),
    },
    actions: {
      clearForm,
      handleEdit,
      handleDelete: (node: Question) => form.handleDelete(node.id, adminT.forms.interrogationForm.deleteConfirm),
      handleSubmit: form.handleSubmit,
      registerFileRef: form.registerFileRef,
    },
    status: { isProcessing: form.isProcessing },
  };
}
