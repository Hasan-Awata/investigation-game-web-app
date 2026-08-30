import { useAdminContext } from '@/context/AdminContext';
import { useBuilderState } from '@/hooks/useBuilderState';
import { useNodeSubmit } from '@/hooks/useNodeSubmit';
import LevelBuilderGuard from '../Shared/LevelBuilderGuard';
import AdminWiretapForm from './AdminWiretapForm';
import EntityList from '../Shared/EntityList';
import type { Question } from '@/types';
import { type DraftChoice } from '../Shared/ChoiceEditorCard';

export default function AdminWiretapBuilder() {
  const { levelId, selectedCase, selectedPhase, selectedLevel } = useAdminContext();

  const { state, refs, setters, actions } = useBuilderState([
    { text: '', outcomes: {}, requirements: {} },
    { text: '', outcomes: {}, requirements: {} }
  ]);

  const { submitNode, isProcessing, feedback: statusMessage, setFeedback: setStatusMessage } = useNodeSubmit(actions.clearForm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.choices.length < 2) return setStatusMessage({ type: 'error', message: 'An intercept node requires at least two choices.' });

    submitNode({
      nodeId: state.editingId || undefined,
      levelId,
      text: state.text,
      storeLocally: state.storeLocally,
      image: state.image,
      audio: state.audio,
      choices: state.choices
    });
  };

  const addChoice = () => setters.setChoices([...state.choices, { text: '', outcomes: {}, requirements: {} }]);
  
  const updateChoice = (index: number, updatedChoice: DraftChoice) => {
    const newChoices = [...state.choices];
    newChoices[index] = updatedChoice;
    setters.setChoices(newChoices);
  };
  
  const removeChoice = (index: number) => setters.setChoices(state.choices.filter((_, i) => i !== index));

  const previewUrl = state.image ? URL.createObjectURL(state.image) : state.existingImgUrl;
  const audioPreviewUrl = state.audio ? URL.createObjectURL(state.audio) : state.existingAudioUrl;

  return (
    <LevelBuilderGuard requiredType="wiretap">
      <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        <AdminWiretapForm
          image={state.image} audio={state.audio}
          editingId={state.editingId} text={state.text} setText={setters.setText}
          storeLocally={state.storeLocally} setStoreLocally={setters.setStoreLocally} 
          imageInputRef={refs.imageInputRef} audioInputRef={refs.audioInputRef}
          setImage={setters.setImage} setAudio={setters.setAudio} 
          choices={state.choices} addChoice={addChoice} updateChoice={updateChoice}
          removeChoice={removeChoice} handleSubmit={handleSubmit} handleCancelEdit={actions.clearForm}
          isProcessing={isProcessing} statusMessage={statusMessage} 
          previewUrl={previewUrl} audioPreviewUrl={audioPreviewUrl}
          contextHeader={`Targeting: ${selectedCase?.title} > ${selectedPhase?.title} > ${selectedLevel?.title}`}
        />

        <EntityList<Question>
          title="Active Wiretap Intercepts"
          items={selectedLevel?.questions || []}
          emptyMessage="No wiretap intercepts built for this level yet."
          keyExtractor={(q) => q.id}
          isProcessing={isProcessing}
          onEdit={actions.handleEdit}
          onDelete={actions.handleDelete}
          renderItemContent={(q) => (
            <>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', marginRight: '1rem', fontSize: '0.85rem' }}>
                [AUDIO FEED: {q.audio_url ? 'CONNECTED' : 'MISSING'}]
              </span>
              <strong style={{ display: 'block', marginTop: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.text}</strong>
            </>
          )}
        />
      </div>
    </LevelBuilderGuard>
  );
}