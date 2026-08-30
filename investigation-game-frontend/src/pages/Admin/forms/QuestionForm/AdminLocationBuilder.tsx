import { useAdminContext } from '@/context/AdminContext';
import { useBuilderState } from '@/hooks/useBuilderState';
import { useCoordinateMapper } from '@/hooks/useCoordinateMapper';
import { useNodeSubmit } from '@/hooks/useNodeSubmit';
import LevelBuilderGuard from '../Shared/LevelBuilderGuard';
import AdminLocationForm from './AdminLocationForm';
import EntityList from '../Shared/EntityList';
import type { Question } from '@/types';
import './AdminLocationBuilder.css';

export default function AdminLocationBuilder() {
  const { levelId, selectedCase, selectedPhase, selectedLevel } = useAdminContext();
  
  const { state, refs, setters, actions } = useBuilderState();
  const { activeCoordinateTarget, setActiveCoordinateTarget, handleImageClick } = useCoordinateMapper(state.choices, setters.setChoices);
  
  const { submitNode, isProcessing, feedback: statusMessage, setFeedback: setStatusMessage } = useNodeSubmit(actions.clearForm);

  const handleCreateNewScene = () => {
    actions.clearForm();
    setters.setIsFormOpen(true);
    setters.setChoices([{ id: crypto.randomUUID(), text: '', outcomes: {}, requirements: {} }]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (state.choices.some(c => !c.text.trim())) {
      return setStatusMessage({ type: 'error', message: 'All points must have coordinate mapping text.' });
    }

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

  const previewUrl = state.image ? URL.createObjectURL(state.image) : state.existingImgUrl;
  const audioPreviewUrl = state.audio ? URL.createObjectURL(state.audio) : state.existingAudioUrl;

  return (
    <LevelBuilderGuard requiredType="location">
      <div className="location-builder-container">
        <div className="admin-form-container glass-panel" style={{ padding: '1.5rem', marginBottom: '0' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', margin: '0 0 0.5rem 0' }}>// Visual Location Editor</h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            Targeting: {selectedCase?.title} &gt; {selectedPhase?.title} &gt; {selectedLevel?.title}
          </span>
        </div>

        {!state.isFormOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" style={{ width: 'auto', padding: '0.75rem 2rem' }} onClick={handleCreateNewScene}>
                + Append New Scene
              </button>
            </div>
            <EntityList<Question>
              title="Location Scenes"
              items={selectedLevel?.questions || []}
              emptyMessage="No scenes configured for this location yet. Click above to initialize one."
              keyExtractor={(q) => q.id}
              isProcessing={isProcessing}
              onEdit={actions.handleEdit}
              onDelete={actions.handleDelete}
              renderItemContent={(scene) => (
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div className="scene-thumbnail" style={{ backgroundImage: `url(${scene.img_url || '/placeholder-crime-scene.jpg'})` }} />
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontSize: '0.8rem' }}>SCENE ID: {scene.id}</span>
                    <h4 style={{ margin: '0.25rem 0', color: 'var(--text-primary)' }}>{scene.text || 'Unnamed Scene'}</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{scene.choices?.length || 0} Interactable Points Mapped</p>
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {state.isFormOpen && (
          <AdminLocationForm
            editingId={state.editingId} text={state.text} setText={setters.setText}
            storeLocally={state.storeLocally} setStoreLocally={setters.setStoreLocally} 
            imageInputRef={refs.imageInputRef} audioInputRef={refs.audioInputRef}
            setImage={setters.setImage} setAudio={setters.setAudio} 
            choices={state.choices} setChoices={setters.setChoices}
            activeCoordinateTarget={activeCoordinateTarget} setActiveCoordinateTarget={setActiveCoordinateTarget}
            handleImageClick={handleImageClick} handleSubmit={handleSubmit} handleCancelEdit={actions.clearForm}
            isProcessing={isProcessing} statusMessage={statusMessage} previewUrl={previewUrl} audioPreviewUrl={audioPreviewUrl}
            contextHeader={`Targeting: ${selectedCase?.title} > ${selectedPhase?.title} > ${selectedLevel?.title}`}
          />
        )}
      </div>
    </LevelBuilderGuard>
  );
}