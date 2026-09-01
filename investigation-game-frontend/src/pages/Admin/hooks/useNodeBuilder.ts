import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAdminContext } from '@/pages/Admin/context/AdminContext';
import { useAdminMutations } from '@/pages/Admin/hooks/useAdminMutations';
import { buildNodeFormData } from '@/pages/Admin/utils/questionUtils';
import type { Question, Choice } from '@/types';
import type { DraftChoice } from '@/pages/Admin/forms/Shared/ChoiceEditorCard';

export function useNodeBuilder(defaultChoices: DraftChoice[] = []) {
  const { setCaseId, setPhaseId, setLevelId, selectedCase, selectedPhase, selectedLevel, levelId, setIsDirty } = useAdminContext();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [text, setText] = useState('');
  const [storeLocally, setStoreLocally] = useState(false);
  const [choices, setChoices] = useState<DraftChoice[]>(defaultChoices);

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { createEntity, updateEntity, deleteEntity, isProcessing } = useAdminMutations('question');

  // Wrapped setters to trigger dirty state tracking
  const handleSetText = (t: string) => { setText(t); setIsDirty(true); };
  const handleSetStoreLocally = (v: boolean) => { setStoreLocally(v); setIsDirty(true); };
  const handleSetChoices = (c: DraftChoice[]) => { setChoices(c); setIsDirty(true); };

  const clearForm = () => {
    setEditingId(null);
    setIsFormOpen(false);
    setText('');
    setStoreLocally(false);
    setChoices(defaultChoices);
    setIsDirty(false);
    Object.values(fileRefs.current).forEach(ref => { if (ref) ref.value = ''; });
  };

  const registerFileRef = (key: string) => (el: HTMLInputElement | null) => {
    fileRefs.current[key] = el;
  };

  const handleEdit = (node: Question) => {
    // Restore parent context pointers
    if (selectedCase) setCaseId(selectedCase.id.toString());
    if (selectedPhase) setPhaseId(selectedPhase.id.toString());
    if (selectedLevel) setLevelId(selectedLevel.id.toString());

    setIsFormOpen(true);
    setEditingId(node.id);
    setText(node.text || '');
    setStoreLocally(false);

    if (node.choices && node.choices.length > 0) {
      setChoices(node.choices.map((c: Choice) => ({
        id: c.id, text: c.text, requirements: c.requirements || {}, outcomes: c.outcomes || {}
      })));
    } else {
      setChoices(defaultChoices);
    }

    setIsDirty(false);
    Object.values(fileRefs.current).forEach(ref => { if (ref) ref.value = ''; });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (node: Question) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      if (editingId === node.id) clearForm();
      deleteEntity(node.id);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>, files: { image?: File | null, audio?: File | null } = {}) => {
    e.preventDefault();

    if (!text.trim()) { toast.error('Node text cannot be empty.'); return; }
    if (choices.length > 0 && choices.some(c => !c.text.trim())) {
      toast.error('All response branches/choices must have text.'); return;
    }

    const formData = buildNodeFormData({
      level_id: levelId,
      text,
      store_locally: storeLocally,
      choices,
      image: files.image || null,
      audio: files.audio || null,
    });

    if (editingId) {
      updateEntity({ id: editingId, formData }, { onSuccess: clearForm });
    } else {
      createEntity(formData, { onSuccess: clearForm });
    }
  };

  return {
    state: { editingId, isFormOpen, text, storeLocally, choices },
    setters: { 
      setIsFormOpen, 
      setText: handleSetText, 
      setStoreLocally: handleSetStoreLocally, 
      setChoices: handleSetChoices 
    },
    actions: { clearForm, handleEdit, handleDelete, handleSubmit, registerFileRef },
    status: { isProcessing }
  };
}