import { useState, useRef } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { useAdminMutations } from '@/hooks/useAdminMutations';
import type { Question, Choice } from '@/types';
import { type DraftChoice } from '../Shared/ChoiceEditorCard';
import { buildNodeFormData } from '../Shared/questionUtils';
import AdminLocationForm from './AdminLocationForm';
import EntityList from '../Shared/EntityList';
import './AdminLocationBuilder.css';

export default function AdminLocationBuilder() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [text, setText] = useState('');
  const [isMandatory, setIsMandatory] = useState(true); 
  const [storeLocally, setStoreLocally] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [existingImgUrl, setExistingImgUrl] = useState<string | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(null);
  
  const [activeCoordinateTarget, setActiveCoordinateTarget] = useState<string | number | null>(null);
  const [choices, setChoices] = useState<DraftChoice[]>([]);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const { caseId, levelId, setCaseId, setPhaseId, setLevelId, selectedCase, selectedPhase, selectedLevel } = useAdminContext();

  const { 
    createEntity, updateEntity, deleteEntity, isProcessing, 
    feedback: statusMessage, setFeedback: setStatusMessage, clearFeedback 
  } = useAdminMutations('question');

  if (!caseId || !levelId || !selectedCase || !selectedPhase || !selectedLevel) {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', margin: '0 0 1rem 0' }}>[ MISSING CONTEXT: TARGET LEVEL REQUIRED ]</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Please select a Case, Phase, and Level from the sidebar to map locations.</p>
      </div>
    );
  }

  if (selectedLevel.presentation_type !== 'location') {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center', borderColor: 'var(--accent-crimson)' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', margin: '0 0 1rem 0' }}>[ INVALID CONTEXT: LEVEL TYPE MISMATCH ]</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>The currently selected level is configured for <strong>'{selectedLevel.presentation_type}'</strong>. You cannot build spatial locations here. Please select a 'Location' level from the sidebar.</p>
      </div>
    );
  }

  const clearForm = () => {
    setEditingId(null); setText(''); setIsMandatory(true); setStoreLocally(false);
    setImage(null); setExistingImgUrl(null); setActiveCoordinateTarget(null);
    setAudio(null); setExistingAudioUrl(null);
    setChoices([]);
    clearFeedback();
    setIsFormOpen(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const handleCreateNewScene = () => {
    clearForm();
    setIsFormOpen(true);
    setChoices([{ id: crypto.randomUUID(), text: '', outcomes: {}, requirements: {} }]);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeCoordinateTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = (((e.clientX - rect.left) / rect.width) * 100).toFixed(1);
    const yPercent = (((e.clientY - rect.top) / rect.height) * 100).toFixed(1);

    const targetChoice = choices.find(c => c.id === activeCoordinateTarget);
    let title = 'New Point';
    if (targetChoice && targetChoice.text.includes('|')) title = targetChoice.text.split('|')[1].trim();
    else if (targetChoice && targetChoice.text.trim() !== '') title = targetChoice.text.trim();

    setChoices(choices.map(c => c.id === activeCoordinateTarget ? { ...c, text: `${xPercent},${yPercent} | ${title}` } : c));
    setActiveCoordinateTarget(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (choices.some(c => !c.text.trim())) {
      return setStatusMessage({ type: 'error', message: 'All points must have coordinate mapping text.' });
    }

    const formData = buildNodeFormData({
      level_id: levelId, text, is_mandatory: isMandatory, store_locally: storeLocally, image, audio, choices
    });

    if (editingId) {
      updateEntity({ id: editingId, formData }, { onSuccess: clearForm });
    } else {
      createEntity(formData, { onSuccess: clearForm });
    }
  };

  const handleEdit = (scene: Question) => {
    setCaseId(selectedCase.id.toString());
    setPhaseId(selectedPhase.id.toString());
    setLevelId(selectedLevel.id.toString());
    
    setIsFormOpen(true);
    setEditingId(scene.id); 
    setText(scene.text || ''); 
    setIsMandatory(!!scene.is_mandatory);

    if (scene.choices && scene.choices.length > 0) {
      setChoices(scene.choices.map((c: Choice) => ({
        id: c.id, text: c.text, requirements: c.requirements || {}, outcomes: c.outcomes || {}
      })));
    } else {
      setChoices([]);
    }

    setImage(null); setExistingImgUrl(scene.img_url || null); setActiveCoordinateTarget(null);
    setAudio(null); setExistingAudioUrl(scene.audio_url || null);
    clearFeedback();
    
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (scene: Question) => {
    if (window.confirm('Are you sure you want to delete this scene?')) {
      if (editingId === scene.id) clearForm();
      deleteEntity(scene.id);
    }
  };

  const previewUrl = image ? URL.createObjectURL(image) : existingImgUrl;
  const audioPreviewUrl = audio ? URL.createObjectURL(audio) : existingAudioUrl;

  return (
    <div className="location-builder-container">
      <div className="admin-form-container glass-panel" style={{ padding: '1.5rem', marginBottom: '0' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', margin: '0 0 0.5rem 0' }}>// Visual Location Editor</h3>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          Targeting: {selectedCase.title} &gt; {selectedPhase.title} &gt; {selectedLevel.title}
        </span>
      </div>

      {!isFormOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" style={{ width: 'auto', padding: '0.75rem 2rem' }} onClick={handleCreateNewScene}>
              + Append New Scene
            </button>
          </div>
          
          <EntityList<Question>
            title="Location Scenes"
            items={selectedLevel.questions || []}
            emptyMessage="No scenes configured for this location yet. Click above to initialize one."
            keyExtractor={(q) => q.id}
            isProcessing={isProcessing}
            onEdit={handleEdit}
            onDelete={handleDelete}
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

      {isFormOpen && (
        <AdminLocationForm
          editingId={editingId} text={text} setText={setText} isMandatory={isMandatory} setIsMandatory={setIsMandatory}
          storeLocally={storeLocally} setStoreLocally={setStoreLocally} imageInputRef={imageInputRef} audioInputRef={audioInputRef}
          setImage={setImage} setAudio={setAudio} choices={choices} setChoices={setChoices}
          activeCoordinateTarget={activeCoordinateTarget} setActiveCoordinateTarget={setActiveCoordinateTarget}
          handleImageClick={handleImageClick} handleSubmit={handleSubmit} handleCancelEdit={clearForm}
          isProcessing={isProcessing} statusMessage={statusMessage} previewUrl={previewUrl} audioPreviewUrl={audioPreviewUrl}
          contextHeader={`Targeting: ${selectedCase.title} > ${selectedPhase.title} > ${selectedLevel.title}`}
        />
      )}
    </div>
  );
}