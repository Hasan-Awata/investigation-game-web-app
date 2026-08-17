import { useState, useRef } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { useAdminMutations } from '@/hooks/useAdminMutations';
import type { Question, Choice } from '@/types';
import { type DraftChoice } from '../Shared/ChoiceEditorCard';
import { buildNodeFormData } from '../Shared/questionUtils';
import AdminWiretapForm from './AdminWiretapForm';
import EntityList from '../Shared/EntityList';

export default function AdminWiretapBuilder() {
  const [editingId, setEditingId] = useState<number | null>(null);

  const [text, setText] = useState('');
  const [storeLocally, setStoreLocally] = useState(false);
  
  const [image, setImage] = useState<File | null>(null);
  const [existingImgUrl, setExistingImgUrl] = useState<string | null>(null);
  
  const [audio, setAudio] = useState<File | null>(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [choices, setChoices] = useState<DraftChoice[]>([
    { text: '', outcomes: {}, requirements: {} },
    { text: '', outcomes: {}, requirements: {} }
  ]);

  const { 
    caseId, levelId, setCaseId, setPhaseId, setLevelId, 
    selectedCase, selectedPhase, selectedLevel 
  } = useAdminContext();

  const { 
    createEntity, updateEntity, deleteEntity, isProcessing, 
    feedback: statusMessage, setFeedback: setStatusMessage, clearFeedback 
  } = useAdminMutations('question');

  if (!caseId || !levelId || !selectedCase || !selectedPhase || !selectedLevel) {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', margin: '0 0 1rem 0' }}>[ MISSING CONTEXT: TARGET LEVEL REQUIRED ]</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Please select a Case, Phase, and Level from the sidebar to map wiretaps.</p>
      </div>
    );
  }

  if (selectedLevel.presentation_type !== 'wiretap') {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center', borderColor: 'var(--accent-crimson)' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', margin: '0 0 1rem 0' }}>[ INVALID CONTEXT: LEVEL TYPE MISMATCH ]</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>The currently selected level is configured for <strong>'{selectedLevel.presentation_type}'</strong>. You cannot build communication intercepts here. Please select a 'Wiretap' level from the sidebar.</p>
      </div>
    );
  }

  const clearForm = () => {
    setEditingId(null); setText(''); setStoreLocally(false);
    setImage(null); setExistingImgUrl(null); setAudio(null); setExistingAudioUrl(null);
    setChoices([{ text: '', outcomes: {}, requirements: {} }, { text: '', outcomes: {}, requirements: {} }]);
    clearFeedback();
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    
    if (choices.length < 2) return setStatusMessage({ type: 'error', message: 'An intercept node requires at least two choices.' });
    if (choices.some(c => !c.text.trim())) return setStatusMessage({ type: 'error', message: 'All choices must have valid text.' });

    const formData = buildNodeFormData({
      level_id: levelId, text, store_locally: storeLocally, image, audio, choices
    });

    if (editingId) {
      updateEntity({ id: editingId, formData }, { onSuccess: clearForm });
    } else {
      createEntity(formData, { onSuccess: clearForm });
    }
  };

  const handleEdit = (question: Question) => {
    setCaseId(selectedCase.id.toString());
    setPhaseId(selectedPhase.id.toString());
    setLevelId(selectedLevel.id.toString());
    
    setEditingId(question.id);
    setText(question.text);
    
    setChoices(question.choices?.map((c: Choice) => ({
      id: c.id, text: c.text, outcomes: c.outcomes || {}, requirements: c.requirements || {}
    })) || []);
    
    setImage(null); setExistingImgUrl(question.img_url || null);
    setAudio(null); setExistingAudioUrl(question.audio_url || null);
    clearFeedback();

    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (question: Question) => {
    if (window.confirm('Are you sure you want to delete this wiretap intercept?')) {
      if (editingId === question.id) clearForm();
      deleteEntity(question.id);
    }
  };

  const addChoice = () => setChoices(prev => [...prev, { text: '', outcomes: {}, requirements: {} }]);
  const updateChoice = (index: number, updatedChoice: DraftChoice) => {
    const newChoices = [...choices];
    newChoices[index] = updatedChoice;
    setChoices(newChoices);
  };
  const removeChoice = (index: number) => setChoices(prev => prev.filter((_, i) => i !== index));

  const previewUrl = image ? URL.createObjectURL(image) : existingImgUrl;
  const audioPreviewUrl = audio ? URL.createObjectURL(audio) : existingAudioUrl;

  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      <AdminWiretapForm
        image={image} audio={audio} 
        editingId={editingId} text={text} setText={setText}
        storeLocally={storeLocally} setStoreLocally={setStoreLocally} imageInputRef={imageInputRef} audioInputRef={audioInputRef}
        setImage={setImage} setAudio={setAudio} choices={choices} addChoice={addChoice} updateChoice={updateChoice}
        removeChoice={removeChoice} handleSubmit={handleSubmit} handleCancelEdit={clearForm}
        isProcessing={isProcessing} statusMessage={statusMessage} previewUrl={previewUrl} audioPreviewUrl={audioPreviewUrl}
        contextHeader={`Targeting: ${selectedCase.title} > ${selectedPhase.title} > ${selectedLevel.title}`}
      />

      <EntityList<Question>
        title="Active Wiretap Intercepts"
        items={selectedLevel.questions || []}
        emptyMessage="No wiretap intercepts built for this level yet."
        keyExtractor={(q) => q.id}
        isProcessing={isProcessing}
        onEdit={handleEdit}
        onDelete={handleDelete}
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
  );
}