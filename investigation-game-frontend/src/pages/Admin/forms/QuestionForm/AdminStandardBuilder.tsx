import { useState, useRef } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { useAdminMutations } from '@/hooks/useAdminMutations';
import type { Question, Choice } from '@/types';
import { type DraftChoice } from '../Shared/ChoiceEditorCard';
import { buildNodeFormData } from '../Shared/questionUtils';
import AdminStandardForm from './AdminStandardForm';
import EntityList from '../Shared/EntityList';

export default function AdminStandardBuilder() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [storeLocally, setStoreLocally] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  

  const [choices, setChoices] = useState<DraftChoice[]>([
    { text: '', outcomes: {} },
    { text: '', outcomes: {} }
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
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Please select a Case, Phase, and Level from the sidebar to manage standard nodes.</p>
      </div>
    );
  }

  if (selectedLevel.presentation_type !== 'standard') {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center', borderColor: 'var(--accent-crimson)' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', margin: '0 0 1rem 0' }}>[ INVALID CONTEXT: LEVEL TYPE MISMATCH ]</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>The currently selected level is configured for <strong>'{selectedLevel.presentation_type}'</strong>. You cannot build standard narrative nodes here. Please select a 'Standard Investigation' level from the sidebar.</p>
      </div>
    );
  }

  const clearForm = () => {
    setEditingId(null);
    setText('');
    setStoreLocally(false);
    setImage(null);
    setAudio(null);
    setChoices([{ text: '', outcomes: {} }, { text: '', outcomes: {} }]);
    clearFeedback();
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    
    if (choices.length < 2) return setStatusMessage({ type: 'error', message: 'A standard node requires at least two choices.' });
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
    
    setImage(null);
    setAudio(null);
    clearFeedback();
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (question: Question) => {
    if (window.confirm('Are you absolutely sure you want to delete this question? This will permanently break any narrative chains pointing to it.')) {
      if (editingId === question.id) clearForm();
      deleteEntity(question.id);
    }
  };

  const addChoice = () => setChoices(prev => [...prev, { text: '', outcomes: {} }]);
  const updateChoice = (index: number, updatedChoice: DraftChoice) => {
    const newChoices = [...choices];
    newChoices[index] = updatedChoice;
    setChoices(newChoices);
  };
  const removeChoice = (index: number) => setChoices(prev => prev.filter((_, i) => i !== index));

  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      <AdminStandardForm 
        image={image} audio={audio}
        editingId={editingId} text={text} setText={setText}
        storeLocally={storeLocally} setStoreLocally={setStoreLocally} imageInputRef={imageInputRef} audioInputRef={audioInputRef}
        setImage={setImage} setAudio={setAudio} choices={choices} addChoice={addChoice} updateChoice={updateChoice}
        removeChoice={removeChoice} handleSubmit={handleSubmit} handleCancelEdit={clearForm}
        isProcessing={isProcessing} statusMessage={statusMessage}
        contextHeader={`Targeting: ${selectedCase.title} > ${selectedPhase.title} > ${selectedLevel.title}`}
      />

      <EntityList<Question>
        title="Active Standard Nodes"
        items={selectedLevel.questions || []}
        emptyMessage="No nodes built for this level yet."
        keyExtractor={(q) => q.id}
        isProcessing={isProcessing}
        onEdit={handleEdit}
        onDelete={handleDelete}
        renderItemContent={(q) => (
          <>
            <strong style={{ display: 'block', marginTop: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.text}</strong>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {q.choices?.length || 0} Diverging Paths
            </div>
          </>
        )}
      />
    </div>
  );
}