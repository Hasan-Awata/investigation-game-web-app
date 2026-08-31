import { useState } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import LevelBuilderGuard from '../Shared/LevelBuilderGuard';
import AdminWiretapForm from './AdminWiretapForm';
import EntityList from '../Shared/EntityList';
import { useNodeBuilder } from '@/hooks/useNodeBuilder';
import type { Question } from '@/types';
import { type DraftChoice } from '../Shared/ChoiceEditorCard';

export default function AdminWiretapBuilder() {
  const { selectedCase, selectedPhase, selectedLevel } = useAdminContext();
  const [image, setImage] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);

  const { state, setters, actions, status } = useNodeBuilder([
    { id: crypto.randomUUID(), text: '', outcomes: {}, requirements: {} },
    { id: crypto.randomUUID(), text: '', outcomes: {}, requirements: {} }
  ]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state.choices.length < 2) return status.setFeedback({ type: 'error', message: 'An intercept node requires at least two choices.' });
    actions.handleSubmit(e, { image, audio });
  };

  const addChoice = () => setters.setChoices([...state.choices, { id: crypto.randomUUID(), text: '', outcomes: {}, requirements: {} }]);
  const updateChoice = (index: number, updatedChoice: DraftChoice) => {
    const newChoices = [...state.choices];
    newChoices[index] = updatedChoice;
    setters.setChoices(newChoices);
  };
  const removeChoice = (index: number) => setters.setChoices(state.choices.filter((_, i) => i !== index));

  const activeNode = selectedLevel?.questions?.find((q: Question) => q.id === state.editingId);
  const previewUrl = image ? URL.createObjectURL(image) : (activeNode?.img_url || null);
  const audioPreviewUrl = audio ? URL.createObjectURL(audio) : (activeNode?.audio_url || null);

  return (
    <LevelBuilderGuard requiredType="wiretap">
      <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        <AdminWiretapForm
          state={state} setters={setters} status={status} previews={{ image: previewUrl, audio: audioPreviewUrl }}
          actions={{ registerFileRef: actions.registerFileRef, handleSubmit, handleCancel: actions.clearForm }}
          setImage={setImage} setAudio={setAudio} addChoice={addChoice} updateChoice={updateChoice} removeChoice={removeChoice}
          contextHeader={`Targeting: ${selectedCase?.title} > ${selectedPhase?.title} > ${selectedLevel?.title}`}
        />

        <EntityList<Question>
          title="Active Wiretap Intercepts" items={selectedLevel?.questions || []} emptyMessage="No wiretap intercepts built."
          keyExtractor={(q) => q.id} isProcessing={status.isProcessing} onEdit={actions.handleEdit} onDelete={actions.handleDelete}
          renderItemContent={(q) => (
            <>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', marginRight: '1rem', fontSize: '0.85rem' }}>
                [AUDIO FEED: {q.audio_url ? 'CONNECTED' : 'MISSING'}]
              </span>
              <strong style={{ display: 'block', marginTop: '0.5rem' }}>{q.text}</strong>
            </>
          )}
        />
      </div>
    </LevelBuilderGuard>
  );
}