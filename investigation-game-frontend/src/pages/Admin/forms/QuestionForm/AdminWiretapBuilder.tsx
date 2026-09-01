import { useState } from 'react';
import toast from 'react-hot-toast';
import NodeBuilderCanvas from './NodeBuilderCanvas';
import AdminWiretapForm from './AdminWiretapForm';
import EntityList from '../Shared/EntityList';
import { useNodeBuilder } from '@/pages/Admin/hooks/useNodeBuilder';
import type { Question } from '@/types';
import { type DraftChoice } from '../Shared/ChoiceEditorCard';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';

export default function AdminWiretapBuilder() {
  const [image, setImage] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.wiretapBuilder;

  const { state, setters, actions, status } = useNodeBuilder([
    { id: crypto.randomUUID(), text: '', outcomes: {}, requirements: {} },
    { id: crypto.randomUUID(), text: '', outcomes: {}, requirements: {} }
  ]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state.choices.length < 2) {
      toast.error(t.minChoicesError);
      return;
    }
    actions.handleSubmit(e, { image, audio });
  };

  const addChoice = () => setters.setChoices([...state.choices, { id: crypto.randomUUID(), text: '', outcomes: {}, requirements: {} }]);
  const updateChoice = (index: number, updatedChoice: DraftChoice) => {
    const newChoices = [...state.choices];
    newChoices[index] = updatedChoice;
    setters.setChoices(newChoices);
  };
  const removeChoice = (index: number) => setters.setChoices(state.choices.filter((_, i) => i !== index));

  return (
    <NodeBuilderCanvas requiredType="wiretap" title={t.canvasTitle}>
      {({ savedNodes }) => {
        const activeNode = savedNodes.find((q: Question) => q.id === state.editingId);
        const previewUrl = image ? URL.createObjectURL(image) : (activeNode?.img_url || null);
        const audioPreviewUrl = audio ? URL.createObjectURL(audio) : (activeNode?.audio_url || null);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            <AdminWiretapForm
              state={state} setters={setters} status={status} previews={{ image: previewUrl, audio: audioPreviewUrl }}
              actions={{ registerFileRef: actions.registerFileRef, handleSubmit, handleCancel: actions.clearForm }}
              setImage={setImage} setAudio={setAudio} addChoice={addChoice} updateChoice={updateChoice} removeChoice={removeChoice}
            />

            <EntityList<Question>
              title={t.listTitle} items={savedNodes} emptyMessage={t.emptyListMsg}
              keyExtractor={(q) => q.id} isProcessing={status.isProcessing} onEdit={actions.handleEdit} onDelete={actions.handleDelete}
              renderItemContent={(q) => (
                <>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', marginRight: '1rem', fontSize: '0.85rem' }}>
                    {t.audioFeedStatus(!!q.audio_url)}
                  </span>
                  <strong style={{ display: 'block', marginTop: '0.5rem' }}>{q.text}</strong>
                </>
              )}
            />
          </div>
        );
      }}
    </NodeBuilderCanvas>
  );
}