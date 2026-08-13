import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  createAdminQuestion, 
  updateAdminQuestion, 
  deleteAdminQuestion, 
  fetchAdminCases 
} from '@/services/adminApi';
import type { GameCase, Level, Question, Choice } from '@/types';
import ChoiceEditorCard, { type DraftChoice } from '../Shared/ChoiceEditorCard';

export default function AdminStandardBuilder() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);

  const [caseId, setCaseId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [text, setText] = useState('');
  const [isMandatory, setIsMandatory] = useState(true);
  const [storeLocally, setStoreLocally] = useState(false);
  
  const [image, setImage] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [choices, setChoices] = useState<DraftChoice[]>([
    { text: '', outcomes: {} },
    { text: '', outcomes: {} }
  ]);
  
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // STRICT TYPING: Applied GameCase[] to the query
  const { data: cases = [], isLoading: isFetchingCases } = useQuery<GameCase[]>({
    queryKey: ['adminCases'],
    queryFn: async () => {
      const result = await fetchAdminCases();
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    }
  });

  const clearForm = () => {
    setEditingId(null);
    setText('');
    setIsMandatory(true);
    setStoreLocally(false);
    setImage(null);
    setAudio(null);
    setChoices([
      { text: '', outcomes: {} },
      { text: '', outcomes: {} }
    ]);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createAdminQuestion(formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setStatusMessage({ type: 'success', message: 'Standard narrative node created.' });
      clearForm();
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setStatusMessage({ type: 'error', message: error.message })
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number, formData: FormData }) => {
      const result = await updateAdminQuestion(id, formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setStatusMessage({ type: 'success', message: 'Standard narrative node updated.' });
      clearForm();
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setStatusMessage({ type: 'error', message: error.message })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await deleteAdminQuestion(id);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setStatusMessage({ type: 'success', message: 'Node deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setStatusMessage({ type: 'error', message: error.message })
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    
    if (!levelId) return setStatusMessage({ type: 'error', message: 'Target phase is required.' });
    if (choices.length < 2) return setStatusMessage({ type: 'error', message: 'A standard node requires at least two choices.' });
    if (choices.some(c => !c.text.trim())) return setStatusMessage({ type: 'error', message: 'All choices must have valid text.' });

    const formData = new FormData();
    formData.append('level_id', levelId);
    formData.append('text', text);
    formData.append('is_mandatory', isMandatory ? '1' : '0');
    formData.append('store_locally', storeLocally ? '1' : '0');
    
    if (image) formData.append('image', image);
    if (audio) formData.append('audio', audio);

    // Deeply append nested JSON structures for Laravel array validation
    choices.forEach((choice, index) => {
      formData.append(`choices[${index}][text]`, choice.text);
      
      if (choice.outcomes) {
        Object.entries(choice.outcomes).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach(v => formData.append(`choices[${index}][outcomes][${key}][]`, String(v)));
          } else if (value !== null && value !== undefined) {
            // Convert booleans to strings (e.g. true -> 'true')
            formData.append(`choices[${index}][outcomes][${key}]`, String(value));
          }
        });
      }

      if (choice.requirements) {
        Object.entries(choice.requirements).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach(v => formData.append(`choices[${index}][requirements][${key}][]`, String(v)));
          }
        });
      }
    });

    if (editingId) updateMutation.mutate({ id: editingId, formData });
    else createMutation.mutate(formData);
  };

  const handleEdit = (question: Question, parentCaseId: number, parentLevelId: number) => {
    setEditingId(question.id);
    setCaseId(parentCaseId.toString());
    setLevelId(parentLevelId.toString());
    setText(question.text);
    setIsMandatory(!!question.is_mandatory);
    
    // Remap existing choices to the DraftChoice interface
    setChoices(question.choices?.map((c: Choice) => ({
      id: c.id,
      text: c.text,
      outcomes: c.outcomes || {},
      requirements: c.requirements || {}
    })) || []);
    
    setImage(null);
    setAudio(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (questionId: number) => {
    if (window.confirm('Are you absolutely sure you want to delete this question? This will permanently break any narrative chains pointing to it.')) {
      setStatusMessage(null);
      if (editingId === questionId) clearForm();
      deleteMutation.mutate(questionId);
    }
  };

  const addChoice = () => {
    setChoices(prev => [...prev, { text: '', outcomes: {} }]);
  };

  const updateChoice = (index: number, updatedChoice: DraftChoice) => {
    const newChoices = [...choices];
    newChoices[index] = updatedChoice;
    setChoices(newChoices);
  };

  const removeChoice = (index: number) => {
    setChoices(prev => prev.filter((_, i) => i !== index));
  };

  const isProcessing = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  
  // Drill down to isolate standard levels
  const selectedCase = cases.find((c: GameCase) => c.id.toString() === caseId);
  const availableLevels = selectedCase?.phases
    ?.flatMap(p => p.levels || [])
    ?.filter((l: Level) => l.presentation_type === 'standard') || [];

  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: editingId ? 'var(--accent-amber)' : 'var(--accent-cyan)', margin: 0 }}>
            {editingId ? `// Editing Standard Node: ${editingId}` : '// Compile Standard Node'}
          </h3>
          {editingId && <button type="button" className="btn-secondary" onClick={clearForm} style={{ padding: '0.5rem 1rem', width: 'auto' }}>Cancel Edit</button>}
        </div>

        {statusMessage && <div className={`status-message ${statusMessage.type}`}>{statusMessage.message}</div>}

        <form onSubmit={handleSubmit} className="admin-form">
          
          {/* THE TARGETING BLOCK */}
          <div className="admin-form-row" style={{ marginBottom: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Target Case</label>
              <select className="admin-input" required value={caseId} onChange={(e) => { setCaseId(e.target.value); setLevelId(''); }} disabled={isFetchingCases}>
                <option value="" disabled>-- Select a Case --</option>
                {cases.map((c: GameCase) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            
            <div className="form-group" style={{ flex: 1 }}>
              <label>Target Standard Phase</label>
              <select className="admin-input" required value={levelId} onChange={(e) => setLevelId(e.target.value)} disabled={!caseId}>
                <option value="" disabled>-- Select a Standard Level --</option>
                {availableLevels.map((l: Level) => (
                  <option key={l.id} value={l.id}>{l.order_index}: {l.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0, 229, 255, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(0, 229, 255, 0.3)' }}>
            <input type="checkbox" id="mandatory-toggle" checked={isMandatory} onChange={(e) => setIsMandatory(e.target.checked)} style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-cyan)' }} />
            <label htmlFor="mandatory-toggle" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', cursor: 'pointer' }}>
              <strong>Mandatory Node:</strong> Players MUST reach a consensus on this verdict before the team is allowed to transition to the next phase. (Uncheck for optional flavor/bonus branches).
            </label>
          </div>

          <div className="form-group">
            <label>Prompt Text (The Verdict)</label>
            <textarea className="admin-textarea" required value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: '120px' }} />
          </div>

          <div className="admin-form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Accompanying Image {editingId && '(Leave blank to keep existing)'}</label>
              <input type="file" className="admin-file-input" accept="image/*" ref={imageInputRef} onChange={(e) => setImage(e.target.files?.[0] || null)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Accompanying Audio {editingId && '(Leave blank to keep existing)'}</label>
              <input type="file" className="admin-file-input" accept="audio/*" ref={audioInputRef} onChange={(e) => setAudio(e.target.files?.[0] || null)} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <input type="checkbox" id="store-locally-toggle" checked={storeLocally} onChange={(e) => setStoreLocally(e.target.checked)} style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-amber)' }} />
            <label htmlFor="store-locally-toggle" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-amber)', cursor: 'pointer' }}>
              <strong>Store Locally on Server:</strong> Save assets directly to public server folders instead of Cloudinary.
            </label>
          </div>

          {/* THE CHOICES BUILDER */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', margin: 0 }}>Choices & Divergence</h4>
              <button type="button" onClick={addChoice} className="btn-secondary" style={{ padding: '0.5rem 1rem', width: 'auto', fontSize: '0.85rem' }}>
                + Add Option
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {choices.map((choice, index) => (
                <ChoiceEditorCard
                  key={index}
                  index={index}
                  choice={choice}
                  updateChoice={(updated) => updateChoice(index, updated)}
                  removeChoice={() => removeChoice(index)}
                  caseId={Number(caseId)} // Pass case ID so the card can fetch correct unlocks
                />
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-cyan)', color: 'var(--bg-dark)', marginTop: '2rem' }}>
            {isProcessing ? 'Transmitting...' : editingId ? 'Update Node' : 'Commit Node to Database'}
          </button>
        </form>
      </div>

      {/* MANAGE EXISTING QUESTIONS */}
      {selectedCase && availableLevels.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', marginBottom: '1.5rem' }}>// Active Standard Nodes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {availableLevels.map((level: Level) => (
              <div key={level.id}>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                  Level {level.order_index}: {level.title}
                </h4>
                {(!level.questions || level.questions.length === 0) ? (
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>No standard nodes assigned.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {level.questions.map((q: Question) => (
                      <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ overflow: 'hidden' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', color: q.is_mandatory ? 'var(--accent-cyan)' : 'var(--text-secondary)', marginRight: '1rem', fontSize: '0.85rem' }}>
                            [{q.is_mandatory ? 'MANDATORY' : 'OPTIONAL'}]
                          </span>
                          <strong style={{ display: 'block', marginTop: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.text}</strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            {q.choices?.length || 0} Diverging Paths
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flex: 'none', marginLeft: '1rem' }}>
                          <button type="button" onClick={() => handleEdit(q, selectedCase.id, level.id)} disabled={isProcessing} style={{ background: 'transparent', border: '1px solid var(--accent-amber)', color: 'var(--accent-amber)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Edit</button>
                          <button type="button" onClick={() => handleDelete(q.id)} disabled={isProcessing} style={{ background: 'transparent', border: '1px solid var(--accent-crimson)', color: 'var(--accent-crimson)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}