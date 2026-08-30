import { useState, useRef } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { useAdminMutations } from '@/hooks/useAdminMutations';
import type { Question, Choice } from '@/types';
import type { DraftChoice } from '@/pages/Admin/forms/Shared/ChoiceEditorCard';

export function useBuilderState(defaultChoices: DraftChoice[] = []) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [text, setText] = useState('');
  const [storeLocally, setStoreLocally] = useState(false);
  
  const [image, setImage] = useState<File | null>(null);
  const [existingImgUrl, setExistingImgUrl] = useState<string | null>(null);
  
  const [audio, setAudio] = useState<File | null>(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(null);
  
  const [choices, setChoices] = useState<DraftChoice[]>(defaultChoices);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const { setCaseId, setPhaseId, setLevelId, selectedCase, selectedPhase, selectedLevel } = useAdminContext();
  const { deleteEntity, clearFeedback } = useAdminMutations('question');

  const clearForm = () => {
    setEditingId(null);
    setIsFormOpen(false);
    setText('');
    setStoreLocally(false);
    setImage(null);
    setExistingImgUrl(null);
    setAudio(null);
    setExistingAudioUrl(null);
    setChoices(defaultChoices);
    clearFeedback();
    
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const handleEdit = (node: Question) => {
    // Restore parent context pointers
    if (selectedCase) setCaseId(selectedCase.id.toString());
    if (selectedPhase) setPhaseId(selectedPhase.id.toString());
    if (selectedLevel) setLevelId(selectedLevel.id.toString());

    setIsFormOpen(true);
    setEditingId(node.id);
    setText(node.text || '');

    if (node.choices && node.choices.length > 0) {
      setChoices(node.choices.map((c: Choice) => ({
        id: c.id, text: c.text, requirements: c.requirements || {}, outcomes: c.outcomes || {}
      })));
    } else {
      setChoices(defaultChoices);
    }

    setImage(null);
    setExistingImgUrl(node.img_url || null);
    setAudio(null);
    setExistingAudioUrl(node.audio_url || null);
    clearFeedback();

    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (node: Question) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      if (editingId === node.id) clearForm();
      deleteEntity(node.id);
    }
  };

  return {
    state: { editingId, isFormOpen, text, storeLocally, image, existingImgUrl, audio, existingAudioUrl, choices },
    refs: { imageInputRef, audioInputRef },
    setters: { setIsFormOpen, setText, setStoreLocally, setImage, setAudio, setChoices },
    actions: { clearForm, handleEdit, handleDelete }
  };
}