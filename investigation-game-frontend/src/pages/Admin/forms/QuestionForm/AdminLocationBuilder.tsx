import { useState } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { useCoordinateMapper } from '@/hooks/useCoordinateMapper';
import { useNodeBuilder } from '@/hooks/useNodeBuilder';
import LevelBuilderGuard from '../Shared/LevelBuilderGuard';
import AdminLocationForm from './AdminLocationForm';
import EntityList from '../Shared/EntityList';
import type { Question } from '@/types';
import './AdminLocationBuilder.css';

export default function AdminLocationBuilder() {
  const { selectedCase, selectedPhase, selectedLevel } = useAdminContext();
  const [image, setImage] = useState<File | null>(null);

  const { state, setters, actions, status } = useNodeBuilder();
  const { activeCoordinateTarget, setActiveCoordinateTarget, handleImageClick } = useCoordinateMapper(state.choices, setters.setChoices);

  const handleCreateNewScene = () => {
    actions.clearForm();
    setImage(null);
    setters.setIsFormOpen(true);
    setters.setChoices([{ id: crypto.randomUUID(), text: '', outcomes: {}, requirements: {} }]);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state.choices.some(c => !c.text.trim())) return status.setFeedback({ type: 'error', message: 'All points must have coordinate mapping text.' });
    actions.handleSubmit(e, { image });
  };

  const activeNode = selectedLevel?.questions?.find((q: Question) => q.id === state.editingId);
  const previewUrl = image ? URL.createObjectURL(image) : (activeNode?.img_url || null);

  return (
    <LevelBuilderGuard requiredType="location">
      <div className="location-builder-container">
        <div className="admin-form-container glass-panel" style={{ padding: '1.5rem', marginBottom: '0' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', margin: '0 0 0.5rem 0' }}>// Visual Location Editor</h3>
        </div>

        {!state.isFormOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" style={{ width: 'auto', padding: '0.75rem 2rem' }} onClick={handleCreateNewScene}>+ Append New Scene</button>
            </div>
            <EntityList<Question>
              title="Location Scenes" items={selectedLevel?.questions || []} emptyMessage="No scenes configured."
              keyExtractor={(q) => q.id} isProcessing={status.isProcessing} onEdit={actions.handleEdit} onDelete={actions.handleDelete}
              renderItemContent={(scene) => (
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div className="scene-thumbnail" style={{ backgroundImage: `url(${scene.img_url || '/placeholder-crime-scene.jpg'})` }} />
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontSize: '0.8rem' }}>SCENE ID: {scene.id}</span>
                    <h4 style={{ margin: '0.25rem 0', color: 'var(--text-primary)' }}>{scene.text || 'Unnamed Scene'}</h4>
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {state.isFormOpen && (
          <AdminLocationForm
            state={state} setters={setters} status={status} previews={{ image: previewUrl }}
            actions={{ registerFileRef: actions.registerFileRef, handleSubmit, handleCancel: actions.clearForm }}
            setImage={setImage} activeCoordinateTarget={activeCoordinateTarget} setActiveCoordinateTarget={setActiveCoordinateTarget}
            handleImageClick={handleImageClick} contextHeader={`Targeting: ${selectedCase?.title} > ${selectedPhase?.title} > ${selectedLevel?.title}`}
          />
        )}
      </div>
    </LevelBuilderGuard>
  );
}