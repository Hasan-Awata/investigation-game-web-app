import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAdminQuestion, updateAdminQuestion, deleteAdminQuestion, fetchAdminCases } from '@/services/adminApi';
import './QuestionForm.css';

interface ChoiceOutcomes {
  feedback: string;
  next_question_id: string;
  gives_strike: boolean; 
  unlock_evidence: string[];
  unlock_levels: string[];
  unlock_suspects: string[];
  unlock_victims: string[];
}

interface ChoiceState {
  id: string; 
  text: string;
  outcomes: ChoiceOutcomes; 
}

const defaultOutcomes = (): ChoiceOutcomes => ({
  feedback: '',
  next_question_id: '',
  gives_strike: false, 
  unlock_evidence: [],
  unlock_levels: [],
  unlock_suspects: [],
  unlock_victims: [],
});

// Helper to convert nested JSON into multipart/form-data arrays for Laravel
const appendToFormData = (fd: FormData, rootKey: string, obj: any) => {
  if (obj === null || obj === undefined) return;
  if (Array.isArray(obj)) {
      obj.forEach((val, i) => appendToFormData(fd, `${rootKey}[${i}]`, val));
  } else if (typeof obj === 'object') {
      Object.keys(obj).forEach(key => appendToFormData(fd, `${rootKey}[${key}]`, obj[key]));
  } else {
      fd.append(rootKey, obj.toString());
  }
};

export default function QuestionForm() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);

  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [phaseId, setPhaseId] = useState(''); 
  const [levelId, setLevelId] = useState('');
  
  const [text, setText] = useState('');
  const [isMandatory, setIsMandatory] = useState(true); 
  const [image, setImage] = useState<File | null>(null);
  const [existingImgUrl, setExistingImgUrl] = useState<string | null>(null);
  const [storeLocally, setStoreLocally] = useState(false);
  
  const [activeCoordinateTarget, setActiveCoordinateTarget] = useState<string | null>(null);
  
  const [choices, setChoices] = useState<ChoiceState[]>([
    { id: crypto.randomUUID(), text: '', outcomes: defaultOutcomes() },
    { id: crypto.randomUUID(), text: '', outcomes: defaultOutcomes() }
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

  const selectedCase = cases.find((c: any) => c.id.toString() === selectedCaseId);
  const availablePhases = selectedCase?.phases || [];
  const selectedPhase = availablePhases.find((p: any) => p.id.toString() === phaseId);
  const availableLevels = selectedPhase?.levels || [];
  const selectedLevel = availableLevels.find((l: any) => l.id.toString() === levelId);
  const isLocationPhase = selectedLevel?.presentation_type === 'location';

  // Data pools for the multi-select unlocks
  const availableEvidences = selectedCase?.evidences || [];
  const availableSuspects = selectedCase?.suspects || [];
  const availableVictims = selectedCase?.victims || [];
  const allCaseLevels = availablePhases.flatMap((p: any) => p.levels?.map((l: any) => ({ ...l, phase_title: p.title })) || []);

  const clearForm = () => {
    setEditingId(null);
    setText('');
    setIsMandatory(true);
    setStoreLocally(false);
    setImage(null);
    setExistingImgUrl(null);
    setActiveCoordinateTarget(null);
    setChoices([
      { id: crypto.randomUUID(), text: '', outcomes: defaultOutcomes() },
      { id: crypto.randomUUID(), text: '', outcomes: defaultOutcomes() }
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
      setFeedback({ type: 'success', message: 'Question committed to database.' });
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
      setFeedback({ type: 'success', message: 'Question updated successfully.' });
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
      setFeedback({ type: 'success', message: 'Question wiped.' });
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const handleDelete = (questionId: number) => {
    if (window.confirm("Are you absolutely sure you want to delete this question? The narrative choices attached to it will also be wiped.")) {
      setFeedback(null);
      if (editingId === questionId) clearForm();
      deleteMutation.mutate(questionId);
    }
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

    updateChoiceText(activeCoordinateTarget, `${xPercent},${yPercent} | ${title}`);
    setActiveCoordinateTarget(null);
  };

  const addChoice = () => setChoices([...choices, { id: crypto.randomUUID(), text: '', outcomes: defaultOutcomes() }]);
  
  const removeChoice = (id: string) => {
    if (choices.length <= 2) return setFeedback({ type: 'error', message: 'Minimum two choices required.' });
    setChoices(choices.filter(c => c.id !== id));
  };

  const updateChoiceText = (id: string, text: string) => setChoices(choices.map(c => c.id === id ? { ...c, text } : c));

  // Outcome Builders Handlers
  const handleOutcomeText = (choiceId: string, field: keyof ChoiceOutcomes, val: string) => {
    setChoices(choices.map(c => c.id === choiceId ? { ...c, outcomes: { ...c.outcomes, [field]: val } } : c));
  };

  const handleMultiSelect = (e: React.ChangeEvent<HTMLSelectElement>, choiceId: string, field: keyof ChoiceOutcomes) => {
    const values = Array.from(e.target.selectedOptions, option => option.value);
    setChoices(choices.map(c => c.id === choiceId ? { ...c, outcomes: { ...c.outcomes, [field]: values } } : c));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const formData = new FormData();
    formData.append('level_id', levelId); 
    formData.append('text', text);
    formData.append('is_mandatory', isMandatory ? '1' : '0'); 
    formData.append('store_locally', storeLocally ? '1' : '0');
    if (image) formData.append('image', image);

    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      if (!choice.text.trim()) return setFeedback({ type: 'error', message: 'All choices must have text.' });
      
      formData.append(`choices[${i}][text]`, choice.text);
      
      // Clean up the outcomes object and pack it as JSON
      const cleanOutcomes: any = {};
      if (choice.outcomes.gives_strike) cleanOutcomes.gives_strike = true;
      if (choice.outcomes.feedback.trim()) cleanOutcomes.feedback = choice.outcomes.feedback.trim();
      if (choice.outcomes.next_question_id.trim()) cleanOutcomes.next_question_id = parseInt(choice.outcomes.next_question_id, 10);
      if (choice.outcomes.unlock_evidence.length > 0) cleanOutcomes.unlock_evidence = choice.outcomes.unlock_evidence.map(Number);
      if (choice.outcomes.unlock_levels.length > 0) cleanOutcomes.unlock_levels = choice.outcomes.unlock_levels.map(Number);
      if (choice.outcomes.unlock_suspects.length > 0) cleanOutcomes.unlock_suspects = choice.outcomes.unlock_suspects.map(Number);
      if (choice.outcomes.unlock_victims.length > 0) cleanOutcomes.unlock_victims = choice.outcomes.unlock_victims.map(Number);

      if (Object.keys(cleanOutcomes).length > 0) {
        appendToFormData(formData, `choices[${i}][outcomes]`, cleanOutcomes);
      }
    }

    if (editingId) updateMutation.mutate({ id: editingId, formData });
    else createMutation.mutate(formData);
  };

  const handleEdit = (question: any, parentCaseId: number, parentPhaseId: number, parentLevelId: number) => {
    setEditingId(question.id);
    setSelectedCaseId(parentCaseId.toString());
    setPhaseId(parentPhaseId.toString());
    setLevelId(parentLevelId.toString());
    setText(question.text);
    setExistingImgUrl(question.img_url || null);
    setIsMandatory(!!question.is_mandatory);

    if (question.choices && question.choices.length > 0) {
      setChoices(question.choices.map((c: any) => ({
        id: crypto.randomUUID(), 
        text: c.text,
        is_correct: !!c.is_correct,
        outcomes: {
          feedback: c.outcomes?.feedback || '',
          next_question_id: c.outcomes?.next_question_id?.toString() || '',
          gives_strike: !!c.outcomes?.gives_strike || false,
          unlock_evidence: c.outcomes?.unlock_evidence?.map(String) || [],
          unlock_levels: c.outcomes?.unlock_levels?.map(String) || [],
          unlock_suspects: c.outcomes?.unlock_suspects?.map(String) || [],
          unlock_victims: c.outcomes?.unlock_victims?.map(String) || [],
        }
      })));
    }

    setImage(null);
    setActiveCoordinateTarget(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isProcessing = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const previewUrl = image ? URL.createObjectURL(image) : existingImgUrl;
  
  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <div>
        <div className="qf-header-container">
          <h3 className={`qf-header-title ${editingId ? 'editing' : 'new'}`}>
            {editingId ? `// Editing Question ID: ${editingId}` : '// Initialize New Question'}
          </h3>
          {editingId && <button type="button" className="btn-secondary" onClick={clearForm} style={{ padding: '0.5rem 1rem', width: 'auto' }}>Cancel</button>}
        </div>

        {feedback && <div className={`status-message ${feedback.type}`}>{feedback.message}</div>}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form-row" style={{ marginBottom: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Target Case</label>
              <select className="admin-input" required value={selectedCaseId} disabled={isFetchingCases} onChange={(e) => { setSelectedCaseId(e.target.value); setPhaseId(''); setLevelId(''); }}>
                <option value="" disabled>-- Select Case --</option>
                {cases.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Target Phase</label>
              <select className="admin-input" required value={phaseId} disabled={!selectedCaseId} onChange={(e) => { setPhaseId(e.target.value); setLevelId(''); }}>
                <option value="" disabled>-- Select Phase --</option>
                {availablePhases.map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Target Level</label>
              <select className="admin-input" required value={levelId} onChange={(e) => setLevelId(e.target.value)} disabled={!phaseId}>
                <option value="" disabled>-- Select Level --</option>
                {availableLevels.map((l: any) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </div>
          </div>

          {isLocationPhase && (
            previewUrl ? (
              <div className="coordinate-picker-container">
                <div className="coordinate-picker-header">
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>Visual Coordinate Mapping</label>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Click crosshair to arm targeter.</p>
                  </div>
                </div>
                <div className="coordinate-picker-image-wrapper" onClick={handleImageClick} style={{ cursor: activeCoordinateTarget ? 'crosshair' : 'default', opacity: activeCoordinateTarget ? 1 : 0.5 }}>
                  <img src={previewUrl} alt="Map Preview" />
                </div>
              </div>
            ) : (
              <div className="terminal-text" style={{ padding: '1rem', border: '1px dashed rgba(255,255,255,0.2)', textAlign: 'left', marginTop: '1rem' }}>
                Upload a Question Image above to enable the interactive coordinate mapper.
              </div>
            )
          )}

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            background: isMandatory ? 'rgba(0, 229, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1.5rem', 
            border: `1px solid ${isMandatory ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
            transition: 'all 0.2s ease'
          }}>
            <input 
              type="checkbox" 
              id="mandatory-toggle" 
              checked={isMandatory} 
              onChange={(e) => setIsMandatory(e.target.checked)} 
              style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-cyan)' }} 
            />
            <label htmlFor="mandatory-toggle" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: isMandatory ? 'var(--accent-cyan)' : 'var(--text-secondary)', cursor: 'pointer', margin: 0 }}>
              <strong>Mandatory Verdict:</strong> Players must resolve this node to clear the phase. (Uncheck for optional lore/evidence sweeps).
            </label>
          </div>

          <div className="form-group">
            <label>Question Text</label>
            <textarea className="admin-textarea" required value={text} onChange={(e) => setText(e.target.value)} />
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Question Image (Location Angle / Reference)</label>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              This image will be used as the interactive map for Location Phases, or as a visual aid for standard questions. Max 4MB.
            </p>
            <input 
              type="file" 
              className="admin-file-input" 
              accept="image/*" 
              ref={imageInputRef} 
              onChange={(e) => setImage(e.target.files?.[0] || null)} 
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <input type="checkbox" id="store-locally-toggle" checked={storeLocally} onChange={(e) => setStoreLocally(e.target.checked)} style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-amber)' }} />
            <label htmlFor="store-locally-toggle" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-amber)', cursor: 'pointer' }}>
              <strong>Store Locally on Server:</strong> Save assets directly to public server folders instead of Cloudinary.
            </label>
          </div>
          
          <div className="qf-choices-container">
            <div className="qf-choices-header">
              <label className="qf-choices-title">Dialogue & Outcomes</label>
              <button type="button" onClick={addChoice} className="btn-secondary" style={{ padding: '0.5rem 1rem', flex: 'none' }}>+ Add Choice</button>
            </div>

            <div className="qf-choices-list">
              {choices.map((choice) => (
                <div key={choice.id} className={`qf-choice-row ${activeCoordinateTarget === choice.id ? 'picking-target' : ''}`}>
                  
                  <div className="qf-choice-top">
                    <input type="text" className="admin-input qf-choice-text-input" required placeholder="Choice text..." value={choice.text} onChange={(e) => updateChoiceText(choice.id, e.target.value)} />
                    
                    {isLocationPhase && (
                      <button 
                        type="button" 
                        className={`pick-point-btn ${activeCoordinateTarget === choice.id ? 'active' : ''}`} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCoordinateTarget(activeCoordinateTarget === choice.id ? null : choice.id);
                        }}
                      >
                        🎯
                      </button>
                    )}
                    
                    <button type="button" className="qf-delete-btn" onClick={() => removeChoice(choice.id)}>×</button>
                  </div>
                  
                  {/* The Graphic Outcomes Builder */}
                  <div className={`qf-choice-bottom ${!isLocationPhase ? 'indented' : ''}`}>
                    <div className="qf-outcomes-builder">
                      
                      <div className="qf-outcome-group">
                        <label className="qf-outcome-label">Custom Feedback Message</label>
                        <input type="text" className="admin-input" placeholder="e.g., I found something useful here." value={choice.outcomes.feedback} onChange={(e) => handleOutcomeText(choice.id, 'feedback', e.target.value)} />
                      </div>

                      <div className="qf-outcomes-grid">
                        <div className="qf-outcome-group">
                          <label className="qf-outcome-label">Next Node ID (Branching)</label>
                          <input type="number" className="admin-input" placeholder="Question ID" value={choice.outcomes.next_question_id} onChange={(e) => handleOutcomeText(choice.id, 'next_question_id', e.target.value)} />
                        </div>

                        <div className="qf-outcome-group">
                          <label className="qf-outcome-label">Unlock Evidence (Ctrl+Click)</label>
                          <select multiple className="admin-input qf-multi-select" value={choice.outcomes.unlock_evidence} onChange={(e) => handleMultiSelect(e, choice.id, 'unlock_evidence')}>
                            {availableEvidences.map((ev: any) => <option key={ev.id} value={ev.id}>EX-{ev.id} {ev.title}</option>)}
                          </select>
                        </div>

                        <div className="qf-outcome-group">
                          <label className="qf-outcome-label">Unlock Phase / Level</label>
                          <select multiple className="admin-input qf-multi-select" value={choice.outcomes.unlock_levels} onChange={(e) => handleMultiSelect(e, choice.id, 'unlock_levels')}>
                            {allCaseLevels.map((l: any) => <option key={l.id} value={l.id}>{l.phase_title}: {l.title}</option>)}
                          </select>
                        </div>

                        <div className="qf-outcome-group">
                          <label className="qf-outcome-label">Unlock Suspect</label>
                          <select multiple className="admin-input qf-multi-select" value={choice.outcomes.unlock_suspects} onChange={(e) => handleMultiSelect(e, choice.id, 'unlock_suspects')}>
                            {availableSuspects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>

                        <div className="qf-outcome-group">
                          <label className="qf-outcome-label">Unlock Victim</label>
                          <select multiple className="admin-input qf-multi-select" value={choice.outcomes.unlock_victims} onChange={(e) => handleMultiSelect(e, choice.id, 'unlock_victims')}>
                            {availableVictims.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                          </select>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', color: 'var(--bg-dark)' }}>
            {isProcessing ? 'Processing...' : 'Commit Question'}
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