import { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createAdminQuestion, fetchAdminCases } from '@/services/adminApi';

interface ChoiceState {
  id: string; 
  text: string;
  is_correct: boolean;
  unlocks_evidence_id?: string; 
}

export default function QuestionForm() {
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [levelId, setLevelId] = useState('');
  
  const [text, setText] = useState('');
  const [msgWhenWrong, setMsgWhenWrong] = useState('');
  const [isMandatory, setIsMandatory] = useState(true); 
  const [image, setImage] = useState<File | null>(null);
  
  const [choices, setChoices] = useState<ChoiceState[]>([
    { id: crypto.randomUUID(), text: '', is_correct: true, unlocks_evidence_id: '' },
    { id: crypto.randomUUID(), text: '', is_correct: false, unlocks_evidence_id: '' }
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
  const availableLevels = selectedCase?.levels || [];
  
  // CLEAN ARCHITECTURE: Pull evidence directly from the case, bypassing levels entirely.
  const availableEvidences = selectedCase?.evidences || []; 

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createAdminQuestion(formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Question and narrative choices committed to the database.' });
      setText('');
      setMsgWhenWrong('');
      setIsMandatory(true);
      setImage(null);
      setChoices([
        { id: crypto.randomUUID(), text: '', is_correct: true, unlocks_evidence_id: '' },
        { id: crypto.randomUUID(), text: '', is_correct: false, unlocks_evidence_id: '' }
      ]);
      if (imageInputRef.current) imageInputRef.current.value = '';
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message });
    }
  });

  const addChoice = () => {
    setChoices([...choices, { id: crypto.randomUUID(), text: '', is_correct: false, unlocks_evidence_id: '' }]);
  };

  const removeChoice = (id: string) => {
    if (choices.length <= 2) {
      setFeedback({ type: 'error', message: 'A question must have at least two choices.' });
      return;
    }
    setChoices(choices.filter(c => c.id !== id));
  };

  const updateChoiceText = (id: string, newText: string) => {
    setChoices(choices.map(c => c.id === id ? { ...c, text: newText } : c));
  };

  const updateChoiceEvidence = (id: string, evidenceId: string) => {
    setChoices(choices.map(c => c.id === id ? { ...c, unlocks_evidence_id: evidenceId } : c));
  };

  const setCorrectChoice = (id: string) => {
    setChoices(choices.map(c => ({ ...c, is_correct: c.id === id })));
  };

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
    if (image) formData.append('image', image);

    choices.forEach((choice, index) => {
      formData.append(`choices[${index}][text]`, choice.text);
      formData.append(`choices[${index}][is_correct]`, choice.is_correct ? '1' : '0');
      if (choice.unlocks_evidence_id) {
        formData.append(`choices[${index}][unlocks_evidence_id]`, choice.unlocks_evidence_id);
      }
    });

    mutation.mutate(formData);
  };

  return (
    <div className="admin-form-container glass-panel">
      {feedback && (
        <div className={`status-message ${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="admin-form">
        
        <div className="admin-form-row" style={{ marginBottom: '1rem' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Target Case</label>
            <select 
              className="admin-input" required
              value={selectedCaseId} 
              onChange={(e) => {
                setSelectedCaseId(e.target.value);
                setLevelId('');
              }} 
              disabled={isFetchingCases}
            >
              <option value="" disabled>-- Select a Case --</option>
              {cases.map((c: any) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ flex: 1 }}>
            <label>Target Level</label>
            <select 
              className="admin-input" required
              value={levelId} 
              onChange={(e) => setLevelId(e.target.value)}
              disabled={!selectedCaseId}
            >
              <option value="" disabled>-- Select a Phase --</option>
              {availableLevels.map((l: any) => (
                <option key={l.id} value={l.id}>Phase {l.order_index}: {l.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
          <input 
            type="checkbox" 
            id="mandatory-toggle"
            checked={isMandatory}
            onChange={(e) => setIsMandatory(e.target.checked)}
            style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-cyan)' }}
          />
          <label htmlFor="mandatory-toggle" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <strong>Mandatory Verdict:</strong> Players must answer this correctly to progress to the next phase. (Uncheck for optional narrative paths).
          </label>
        </div>

        <div className="form-group">
          <label>The Verdict (Question Text)</label>
          <textarea 
            className="admin-textarea" required
            value={text} onChange={(e) => setText(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label>Persona Hint (Message when wrong)</label>
          <input 
            type="text" className="admin-input"
            value={msgWhenWrong} onChange={(e) => setMsgWhenWrong(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label>Supporting Image (Optional)</label>
          <input 
            type="file" className="admin-file-input" accept="image/*"
            ref={imageInputRef}
            onChange={(e) => setImage(e.target.files?.[0] || null)} 
          />
        </div>

        <div style={{ margin: '1.5rem 0', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <label style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>Multiple Choices & Narrative Unlocks</label>
            <button type="button" onClick={addChoice} className="btn-secondary" style={{ padding: '0.5rem 1rem', flex: 'none' }}>
              + Add Choice
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {choices.map((choice, index) => (
              <div key={choice.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input 
                    type="radio" 
                    name="correct_choice" 
                    checked={choice.is_correct}
                    onChange={() => setCorrectChoice(choice.id)}
                    style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-success)' }}
                    title="Mark as correct answer"
                  />
                  <input 
                    type="text" className="admin-input" required style={{ flex: 1 }}
                    placeholder={`Choice ${index + 1}`}
                    value={choice.text} onChange={(e) => updateChoiceText(choice.id, e.target.value)} 
                  />
                  <button 
                    type="button" onClick={() => removeChoice(choice.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-crimson)', cursor: 'pointer', fontSize: '1.5rem' }}
                    title="Remove choice"
                  >
                    ×
                  </button>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '2.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--accent-amber)', width: '150px', fontFamily: 'var(--font-mono)' }}>↳ Unlocks Evidence:</label>
                  <select 
                    className="admin-input" 
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.9rem' }}
                    value={choice.unlocks_evidence_id || ''} 
                    onChange={(e) => updateChoiceEvidence(choice.id, e.target.value)}
                    disabled={!selectedCaseId}
                  >
                    <option value="">-- No Narrative Unlock --</option>
                    {availableEvidences.map((ev: any) => (
                      <option key={ev.id} value={ev.id}>EX-{ev.id.toString().padStart(3, '0')} : {ev.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button 
          type="submit" 
          className="btn-primary" 
          disabled={mutation.isPending}
          style={{ background: 'var(--accent-crimson)' }}
        >
          {mutation.isPending ? 'Encrypting Data...' : 'Commit Question to Database'}
        </button>
      </form>
    </div>
  );
}