import { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createAdminQuestion, fetchAdminCases } from '@/services/adminApi';

interface ChoiceState {
  id: string; 
  text: string;
  is_correct: boolean;
}

export default function QuestionForm() {
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [levelId, setLevelId] = useState('');
  
  const [text, setText] = useState('');
  const [msgWhenWrong, setMsgWhenWrong] = useState('');
  const [image, setImage] = useState<File | null>(null);
  
  const [choices, setChoices] = useState<ChoiceState[]>([
    { id: crypto.randomUUID(), text: '', is_correct: true },
    { id: crypto.randomUUID(), text: '', is_correct: false }
  ]);
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch cases and levels for the cascading dropdowns
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

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createAdminQuestion(formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Question and choices committed to the database.' });
      setText('');
      setMsgWhenWrong('');
      setImage(null);
      setChoices([
        { id: crypto.randomUUID(), text: '', is_correct: true },
        { id: crypto.randomUUID(), text: '', is_correct: false }
      ]);
      if (imageInputRef.current) imageInputRef.current.value = '';
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message });
    }
  });

  // Choice management functions
  const addChoice = () => {
    setChoices([...choices, { id: crypto.randomUUID(), text: '', is_correct: false }]);
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
    if (msgWhenWrong) formData.append('msg_when_wrong', msgWhenWrong);
    if (image) formData.append('image', image);

    choices.forEach((choice, index) => {
      formData.append(`choices[${index}][text]`, choice.text);
      formData.append(`choices[${index}][is_correct]`, choice.is_correct ? '1' : '0');
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
        
        {/* Cascading Dropdowns */}
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
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
              <option value="" disabled>-- Select a Level --</option>
              {availableLevels.map((l: any) => (
                <option key={l.id} value={l.id}>Phase {l.order_index}: {l.title}</option>
              ))}
            </select>
          </div>
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
            <label style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>Multiple Choices</label>
            <button type="button" onClick={addChoice} className="btn-secondary" style={{ padding: '0.5rem 1rem', flex: 'none' }}>
              + Add Choice
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {choices.map((choice, index) => (
              <div key={choice.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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