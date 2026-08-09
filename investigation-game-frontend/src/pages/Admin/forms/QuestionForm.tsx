import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAdminQuestion, updateAdminQuestion, deleteAdminQuestion, fetchAdminCases } from '@/services/adminApi';

interface ChoiceState {
  id: string; 
  text: string;
  feedback_message?: string; 
  is_correct: boolean;
  unlocks_evidence_id?: string; 
  unlocks_level_id?: string; 
}

export default function QuestionForm() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);

  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [phaseId, setPhaseId] = useState(''); 
  const [levelId, setLevelId] = useState('');
  
  const [text, setText] = useState('');
  const [msgWhenWrong, setMsgWhenWrong] = useState('');
  const [isMandatory, setIsMandatory] = useState(true); 
  const [image, setImage] = useState<File | null>(null);
  const [storeLocally, setStoreLocally] = useState(false);
  
  const [activeCoordinateTarget, setActiveCoordinateTarget] = useState<string | null>(null);
  
  const [choices, setChoices] = useState<ChoiceState[]>([
    { id: crypto.randomUUID(), text: '', is_correct: true, unlocks_evidence_id: '', unlocks_level_id: '' },
    { id: crypto.randomUUID(), text: '', is_correct: false, unlocks_evidence_id: '', unlocks_level_id: '' }
  ]);
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { data: cases = [], isLoading: isFetchingCases } = useQuery({
    queryKey: ['adminCases'],
    queryFn: async () => {
      const result = await fetchAdminCases();
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    }
  });

  // HIERARCHICAL LOOKUPS
  const selectedCase = cases.find((c: any) => c.id.toString() === selectedCaseId);
  const availablePhases = selectedCase?.phases || [];
  const selectedPhase = availablePhases.find((p: any) => p.id.toString() === phaseId);
  const availableLevels = selectedPhase?.levels || [];
  const availableEvidences = selectedCase?.evidences || []; 

  const selectedLevel = availableLevels.find((l: any) => l.id.toString() === levelId);
  const isLocationPhase = selectedLevel?.presentation_type === 'location';

  const clearForm = () => {
    setEditingId(null);
    setText('');
    setMsgWhenWrong('');
    setIsMandatory(true);
    setStoreLocally(false);
    setImage(null);
    setActiveCoordinateTarget(null);
    setChoices([
      { id: crypto.randomUUID(), text: '', is_correct: true, unlocks_evidence_id: '', unlocks_level_id: '' },
      { id: crypto.randomUUID(), text: '', is_correct: false, unlocks_evidence_id: '', unlocks_level_id: '' }
    ]);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createAdminQuestion(formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Question and narrative choices committed to the database.' });
      clearForm();
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number, formData: FormData }) => {
      const result = await updateAdminQuestion(id, formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Question and narrative choices successfully updated.' });
      clearForm();
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await deleteAdminQuestion(id);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Question and its choices wiped from the database.' });
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeCoordinateTarget) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const xRelative = e.clientX - rect.left;
    const yRelative = e.clientY - rect.top;
    const xPercent = ((xRelative / rect.width) * 100).toFixed(1);
    const yPercent = ((yRelative / rect.height) * 100).toFixed(1);

    const targetChoice = choices.find(c => c.id === activeCoordinateTarget);
    let title = 'New Point';
    if (targetChoice && targetChoice.text.includes('|')) {
      title = targetChoice.text.split('|')[1].trim();
    } else if (targetChoice && targetChoice.text.trim() !== '') {
      title = targetChoice.text.trim();
    }

    updateChoiceText(activeCoordinateTarget, `${xPercent},${yPercent} | ${title}`);
    
    setActiveCoordinateTarget(null);
  };

  const addChoice = () => setChoices([...choices, { id: crypto.randomUUID(), text: '', is_correct: false, unlocks_evidence_id: '', unlocks_level_id: '' }]);
  
  const removeChoice = (id: string) => {
    if (choices.length <= 2) {
      setFeedback({ type: 'error', message: 'A question must have at least two choices.' });
      return;
    }
    setChoices(choices.filter(c => c.id !== id));
    if (activeCoordinateTarget === id) setActiveCoordinateTarget(null);
  };

  const updateChoiceText = (id: string, newText: string) => setChoices(choices.map(c => c.id === id ? { ...c, text: newText } : c));
  const updateChoiceFeedback = (id: string, newFeedback: string) => setChoices(choices.map(c => c.id === id ? { ...c, feedback_message: newFeedback } : c));
  const updateChoiceEvidence = (id: string, evidenceId: string) => setChoices(choices.map(c => c.id === id ? { ...c, unlocks_evidence_id: evidenceId } : c));
  const updateChoiceLevel = (id: string, levelUnlockId: string) => setChoices(choices.map(c => c.id === id ? { ...c, unlocks_level_id: levelUnlockId } : c));
  const setCorrectChoice = (id: string) => setChoices(choices.map(c => ({ ...c, is_correct: c.id === id })));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (choices.some(c => c.text.trim() === '')) {
      setFeedback({ type: 'error', message: 'All choices must have text.' });
      return;
    }

    const formData = new FormData();
    formData.append('level_id', levelId); 
    formData.append('text', text);
    formData.append('is_mandatory', isMandatory ? '1' : '0'); 
    if (msgWhenWrong) formData.append('msg_when_wrong', msgWhenWrong);
    formData.append('store_locally', storeLocally ? '1' : '0');
    if (image) formData.append('image', image);

    choices.forEach((choice, index) => {
      formData.append(`choices[${index}][text]`, choice.text);
      formData.append(`choices[${index}][is_correct]`, choice.is_correct ? '1' : '0');
      
      // Enforce the constraint on the payload level
      if (isLocationPhase && choice.feedback_message) {
        formData.append(`choices[${index}][feedback_message]`, choice.feedback_message);
      }
      
      if (choice.unlocks_evidence_id) formData.append(`choices[${index}][unlocks_evidence_id]`, choice.unlocks_evidence_id);
      if (choice.unlocks_level_id) formData.append(`choices[${index}][unlocks_level_id]`, choice.unlocks_level_id);
    });

    if (editingId) updateMutation.mutate({ id: editingId, formData });
    else createMutation.mutate(formData);
  };

  const handleEdit = (question: any, parentCaseId: number, parentPhaseId: number, parentLevelId: number) => {
    setEditingId(question.id);
    setSelectedCaseId(parentCaseId.toString());
    setPhaseId(parentPhaseId.toString());
    setLevelId(parentLevelId.toString());
    setText(question.text);
    setMsgWhenWrong(question.msg_when_wrong || '');
    setIsMandatory(!!question.is_mandatory);

    // Map existing choices from the database back into the frontend state
    if (question.choices && question.choices.length > 0) {
      setChoices(question.choices.map((c: any) => ({
        id: crypto.randomUUID(), 
        text: c.text,
        feedback_message: c.feedback_message || '', // Map it here
        is_correct: !!c.is_correct,
        unlocks_evidence_id: c.unlocks_evidence_id?.toString() || '',
        unlocks_level_id: c.unlocks_level_id?.toString() || ''
      })));
    } else {
      setChoices([
        { id: crypto.randomUUID(), text: '', is_correct: true, unlocks_evidence_id: '', unlocks_level_id: '' },
        { id: crypto.randomUUID(), text: '', is_correct: false, unlocks_evidence_id: '', unlocks_level_id: '' }
      ]);
    }

    setImage(null);
    setActiveCoordinateTarget(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (questionId: number) => {
    if (window.confirm("Are you absolutely sure you want to delete this question? The narrative choices attached to it will also be wiped.")) {
      setFeedback(null);
      if (editingId === questionId) clearForm();
      deleteMutation.mutate(questionId);
    }
  };

  const isProcessing = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      {/* FORM SECTION */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', margin: 0 }}>
            {editingId ? `// Editing Question ID: ${editingId}` : '// Initialize New Question'}
          </h3>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={clearForm} style={{ padding: '0.5rem 1rem', width: 'auto' }}>
              Cancel Edit
            </button>
          )}
        </div>

        {feedback && <div className={`status-message ${feedback.type}`}>{feedback.message}</div>}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form-row" style={{ marginBottom: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Target Case</label>
              <select className="admin-input" required value={selectedCaseId} disabled={isFetchingCases}
                onChange={(e) => { setSelectedCaseId(e.target.value); setPhaseId(''); setLevelId(''); setActiveCoordinateTarget(null); }} 
              >
                <option value="" disabled>-- Select a Case --</option>
                {cases.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>Target Phase</label>
              <select className="admin-input" required value={phaseId} disabled={!selectedCaseId}
                onChange={(e) => { setPhaseId(e.target.value); setLevelId(''); setActiveCoordinateTarget(null); }} 
              >
                <option value="" disabled>-- Select a Phase --</option>
                {availablePhases.map((p: any) => <option key={p.id} value={p.id}>{p.order_index}: {p.title}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>Target Level</label>
              <select className="admin-input" required value={levelId} onChange={(e) => { setLevelId(e.target.value); setActiveCoordinateTarget(null); }} disabled={!phaseId}>
                <option value="" disabled>-- Select a Level --</option>
                {availableLevels.map((l: any) => <option key={l.id} value={l.id}>Lead {l.order_index}: {l.title}</option>)}
              </select>
            </div>
          </div>

          {isLocationPhase && selectedLevel?.img_url && (
            <div className="coordinate-picker-container">
              <div className="coordinate-picker-header">
                <div>
                  <label style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>Visual Coordinate Mapping</label>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {activeCoordinateTarget 
                      ? "TARGET LOCKED: Click anywhere on the image below to record coordinates." 
                      : "Click the crosshair icon next to a choice below to arm the targeter."}
                  </p>
                </div>
                {activeCoordinateTarget && (
                  <button type="button" className="btn-secondary" style={{ flex: 'none', padding: '0.5rem 1rem' }} onClick={() => setActiveCoordinateTarget(null)}>Cancel Targeting</button>
                )}
              </div>
              
              <div 
                className="coordinate-picker-image-wrapper" 
                onClick={handleImageClick}
                style={{ cursor: activeCoordinateTarget ? 'crosshair' : 'default', opacity: activeCoordinateTarget ? 1 : 0.5 }}
              >
                <img src={selectedLevel.img_url} alt="Level Map" />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
            <input type="checkbox" id="mandatory-toggle" checked={isMandatory} onChange={(e) => setIsMandatory(e.target.checked)} style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-cyan)' }} />
            <label htmlFor="mandatory-toggle" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <strong>Mandatory Verdict:</strong> Players must answer this correctly to progress to the next phase.
            </label>
          </div>

          <div className="form-group">
            <label>{isLocationPhase ? "Location Clue / Point Description" : "The Verdict (Question Text)"}</label>
            <textarea className="admin-textarea" required value={text} onChange={(e) => setText(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Persona Hint (Message when wrong)</label>
            <input type="text" className="admin-input" value={msgWhenWrong} onChange={(e) => setMsgWhenWrong(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Question Image {editingId && '(Leave blank to keep existing)'}</label>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              <strong>Optimal:</strong> 16:9 or 4:3 ratio. Useful for visual diagrams, specific clues, or maps. Max 4MB.
            </p>
            <input type="file" className="admin-file-input" accept="image/*" ref={imageInputRef} onChange={(e) => setImage(e.target.files?.[0] || null)} />
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            background: 'rgba(255,255,255,0.02)', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginTop: '1rem',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <input 
              type="checkbox" 
              id="store-locally-toggle" 
              checked={storeLocally} 
              onChange={(e) => setStoreLocally(e.target.checked)} 
              style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-amber)' }} 
            />
            <label htmlFor="store-locally-toggle" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-amber)', cursor: 'pointer' }}>
              <strong>Store Locally on Server:</strong> Save assets directly to public server folders instead of Cloudinary.
            </label>
          </div>

          <div style={{ margin: '1.5rem 0', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <label style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>Multiple Choices & Narrative Unlocks</label>
              <button type="button" onClick={addChoice} className="btn-secondary" style={{ padding: '0.5rem 1rem', flex: 'none' }}>+ Add Choice</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {choices.map((choice, index) => {
                const isTargeting = activeCoordinateTarget === choice.id;

                return (
                  <div key={choice.id} className={`choice-row ${isTargeting ? 'picking-target' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.1)', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      
                      {!isLocationPhase && (
                        <input 
                          type="radio" name="correct_choice" checked={choice.is_correct}
                          onChange={() => setCorrectChoice(choice.id)}
                          style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-success)' }}
                          title="Mark as correct answer"
                        />
                      )}
                      
                      <input 
                        type="text" className="admin-input" required style={{ flex: 1 }}
                        placeholder={isLocationPhase ? `X,Y | Location Title` : `Choice ${index + 1}`}
                        value={choice.text} onChange={(e) => updateChoiceText(choice.id, e.target.value)} 
                      />

                      {isLocationPhase && selectedLevel?.img_url && (
                        <button 
                          type="button" 
                          className={`pick-point-btn ${isTargeting ? 'active' : ''}`} 
                          onClick={() => setActiveCoordinateTarget(isTargeting ? null : choice.id)}
                          title="Pick coordinates from image"
                        >
                          🎯
                        </button>
                      )}

                      <button 
                        type="button" onClick={() => removeChoice(choice.id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-crimson)', cursor: 'pointer', fontSize: '1.5rem' }}
                        title="Remove choice"
                      >
                        ×
                      </button>
                    </div>
                               
                    <div style={{ display: 'flex', alignItems: 'center', paddingLeft: isLocationPhase ? '0' : '2.5rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--accent-amber)', width: '150px', fontFamily: 'var(--font-mono)' }}>↳ Unlocks Evidence:</label>
                      <select className="admin-input" style={{ flex: 1, padding: '0.5rem', fontSize: '0.9rem' }} value={choice.unlocks_evidence_id || ''} onChange={(e) => updateChoiceEvidence(choice.id, e.target.value)}>
                        <option value="">-- No Narrative Unlock --</option>
                        {availableEvidences.map((ev: any) => <option key={ev.id} value={ev.id}>EX-{ev.id.toString().padStart(3, '0')} : {ev.title}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', paddingLeft: isLocationPhase ? '0' : '2.5rem', marginTop: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--accent-amber)', width: '150px', fontFamily: 'var(--font-mono)' }}>↳ Unlocks Next Phase:</label>
                      <select className="admin-input" style={{ flex: 1, padding: '0.5rem', fontSize: '0.9rem' }} value={choice.unlocks_level_id || ''} onChange={(e) => updateChoiceLevel(choice.id, e.target.value)}>
                        <option value="">-- No Phase Unlock --</option>
                        {availablePhases.flatMap((p: any) => 
                          p.levels?.map((l: any) => (
                            <option key={l.id} value={l.id}>{p.title} - Lead {l.order_index}: {l.title}</option>
                          ))
                        )}
                      </select>
                    </div>

                    {isLocationPhase && (
                      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '0', marginTop: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', width: '150px', fontFamily: 'var(--font-mono)' }}>↳ Custom Feedback:</label>
                        <input 
                          type="text" 
                          className="admin-input" 
                          style={{ flex: 1, padding: '0.5rem', fontSize: '0.9rem' }} 
                          placeholder={choice.is_correct ? "e.g., I found something useful here." : "e.g., Nothing was found here."}
                          value={choice.feedback_message || ''} 
                          onChange={(e) => updateChoiceFeedback(choice.id, e.target.value)} 
                        />
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', color: 'var(--bg-dark)' }}>
            {isProcessing ? 'Processing Data...' : editingId ? 'Update Question' : 'Commit Question to Database'}
          </button>
        </form>
      </div>

      {/* MANAGE EXISTING QUESTIONS */}
      {selectedLevel && selectedLevel.questions && selectedLevel.questions.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', marginBottom: '1.5rem' }}>// Manage Existing Questions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {selectedLevel.questions.map((q: any) => (
              <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ overflow: 'hidden', paddingRight: '1rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginRight: '1rem' }}>Q-ID: {q.id}</span>
                  <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '300px', verticalAlign: 'bottom' }}>
                    {q.text}
                  </strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {q.choices?.length || 0} Choices • {q.is_mandatory ? 'Mandatory' : 'Optional'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                  <button type="button" onClick={() => handleEdit(q, selectedCase.id, selectedPhase.id, selectedLevel.id)} disabled={isProcessing} style={{ background: 'transparent', border: '1px solid var(--accent-amber)', color: 'var(--accent-amber)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Edit</button>
                  <button type="button" onClick={() => handleDelete(q.id)} disabled={isProcessing} style={{ background: 'transparent', border: '1px solid var(--accent-crimson)', color: 'var(--accent-crimson)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}