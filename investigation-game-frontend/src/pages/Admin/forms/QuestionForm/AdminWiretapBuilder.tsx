// FILE: src/pages/Admin/forms/LevelForm/AdminWiretapBuilder.tsx

import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAdminQuestion, updateAdminQuestion, deleteAdminQuestion, fetchAdminCases } from '@/services/adminApi';
import ChoiceEditorCard, { type FlattenedChoice, type LevelWithPhase } from '../QuestionForm/ChoiceEditorCard';
import { type ChoiceState, defaultRequirements, defaultOutcomes, appendChoicesToFormData } from '../QuestionForm/questionUtils';
import type { GameCase, Question, Choice } from '@/types';
import '../QuestionForm/QuestionForm.css';

export default function AdminWiretapBuilder() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);

  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [phaseId, setPhaseId] = useState<string>(''); 
  const [levelId, setLevelId] = useState<string>('');
  
  const [text, setText] = useState('');
  const [isMandatory, setIsMandatory] = useState(true); 
  const [storeLocally, setStoreLocally] = useState(false);
  
  const [image, setImage] = useState<File | null>(null);
  const [existingImgUrl, setExistingImgUrl] = useState<string | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(null);
  
  const [choices, setChoices] = useState<ChoiceState[]>([
    { id: crypto.randomUUID(), text: '', outcomes: defaultOutcomes(), requirements: defaultRequirements() },
    { id: crypto.randomUUID(), text: '', outcomes: defaultOutcomes(), requirements: defaultRequirements() }
  ]);
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const { data: cases = [], isLoading: isFetchingCases } = useQuery<GameCase[]>({
    queryKey: ['adminCases'],
    queryFn: async () => {
      const result = await fetchAdminCases();
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    }
  });

  const selectedCase = cases.find((c) => c.id.toString() === selectedCaseId);
  const availablePhases = selectedCase?.phases || [];
  const selectedPhase = availablePhases.find((p) => p.id.toString() === phaseId);
  
  const availableLevels = selectedPhase?.levels?.filter((l) => l.presentation_type === 'wiretap') || [];
  const selectedLevel = availableLevels.find((l) => l.id.toString() === levelId);

  const availableEvidences = selectedCase?.evidences || [];
  const availableSuspects = selectedCase?.suspects || [];
  const availableVictims = selectedCase?.victims || [];
  
  const allCaseLevels: LevelWithPhase[] = availablePhases.flatMap((p) => 
    (p.levels || []).map((l) => ({ ...l, phase_title: p.title }))
  );

  const allCaseChoices: FlattenedChoice[] = allCaseLevels.flatMap((l) => 
    (l.questions || []).flatMap((q) => 
      (q.choices || []).map((c) => ({ id: c.id, text: c.text, question_text: q.text, level_title: l.phase_title }))
    )
  );

  const clearForm = () => {
    setEditingId(null); setText(''); setIsMandatory(true); setStoreLocally(false);
    setImage(null); setExistingImgUrl(null); 
    setAudio(null); setExistingAudioUrl(null);
    setChoices([
      { id: crypto.randomUUID(), text: '', outcomes: defaultOutcomes(), requirements: defaultRequirements() },
      { id: crypto.randomUUID(), text: '', outcomes: defaultOutcomes(), requirements: defaultRequirements() }
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
    onSuccess: () => { setFeedback({ type: 'success', message: 'Intercept recorded.' }); clearForm(); queryClient.invalidateQueries({ queryKey: ['adminCases'] }); },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number, formData: FormData }) => {
      const result = await updateAdminQuestion(id, formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => { setFeedback({ type: 'success', message: 'Intercept updated.' }); clearForm(); queryClient.invalidateQueries({ queryKey: ['adminCases'] }); },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await deleteAdminQuestion(id);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => { setFeedback({ type: 'success', message: 'Intercept purged.' }); queryClient.invalidateQueries({ queryKey: ['adminCases'] }); },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const formData = new FormData();
    formData.append('level_id', levelId); 
    formData.append('text', text);
    formData.append('is_mandatory', isMandatory ? '1' : '0'); 
    formData.append('store_locally', storeLocally ? '1' : '0');
    if (image) formData.append('image', image);
    if (audio) formData.append('audio', audio);

    if (choices.some(c => !c.text.trim())) {
      return setFeedback({ type: 'error', message: 'All choices must have text.' });
    }

    appendChoicesToFormData(formData, choices);

    if (editingId) updateMutation.mutate({ id: editingId, formData });
    else createMutation.mutate(formData);
  };

  const handleEdit = (question: Question, parentCaseId: number, parentPhaseId: number, parentLevelId: number) => {
    setEditingId(question.id); setSelectedCaseId(parentCaseId.toString());
    setPhaseId(parentPhaseId.toString()); setLevelId(parentLevelId.toString());
    setText(question.text); setIsMandatory(!!question.is_mandatory);

    if (question.choices && question.choices.length > 0) {
      setChoices(question.choices.map((c: Choice) => ({
        id: crypto.randomUUID(), 
        text: c.text,
        requirements: {
          required_evidence: c.requirements?.required_evidence?.map(String) || [],
          required_choices: c.requirements?.required_choices?.map(String) || [],
        },
        outcomes: {
          feedback: c.outcomes?.feedback || '',
          next_question_id: c.outcomes?.next_question_id?.toString() || '',
          gives_strike: !!c.outcomes?.gives_strike,
          unlock_evidence: c.outcomes?.unlock_evidence?.map(String) || [],
          unlock_levels: c.outcomes?.unlock_levels?.map(String) || [],
          unlock_suspects: c.outcomes?.unlock_suspects?.map(String) || [],
          unlock_victims: c.outcomes?.unlock_victims?.map(String) || [],
        }
      })));
    }

    setImage(null); setExistingImgUrl(question.img_url || null); 
    setAudio(null); setExistingAudioUrl(question.audio_url || null);
    
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isProcessing = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const imagePreviewUrl = image ? URL.createObjectURL(image) : existingImgUrl;
  const audioPreviewUrl = audio ? URL.createObjectURL(audio) : existingAudioUrl;

  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <div>
        <div className="qf-header-container">
          <h3 className={`qf-header-title ${editingId ? 'editing' : 'new'}`}>
            {editingId ? `// Editing Intercept ID: ${editingId}` : '// Compile Wiretap Intercept'}
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
                {cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Target Phase</label>
              <select className="admin-input" required value={phaseId} disabled={!selectedCaseId} onChange={(e) => { setPhaseId(e.target.value); setLevelId(''); }}>
                <option value="" disabled>-- Select Phase --</option>
                {availablePhases.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Target Level</label>
              <select className="admin-input" required value={levelId} onChange={(e) => setLevelId(e.target.value)} disabled={!phaseId}>
                <option value="" disabled>-- Select Wiretap Level --</option>
                {availableLevels.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: isMandatory ? 'rgba(0, 229, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: `1px solid ${isMandatory ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`, transition: 'all 0.2s ease' }}>
            <input type="checkbox" id="mandatory-toggle" checked={isMandatory} onChange={(e) => setIsMandatory(e.target.checked)} style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-cyan)' }} />
            <label htmlFor="mandatory-toggle" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: isMandatory ? 'var(--accent-cyan)' : 'var(--text-secondary)', cursor: 'pointer', margin: 0 }}>
              <strong>Mandatory Verdict:</strong> Players must resolve this intercept to clear the phase.
            </label>
          </div>

          <div className="form-group">
            <label>Intercept Transcript / Question Text</label>
            <textarea className="admin-textarea" required value={text} onChange={(e) => setText(e.target.value)} />
          </div>

          <div className="admin-form-row" style={{ marginTop: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Intercept Audio Recording</label>
              <input type="file" className="admin-file-input" accept="audio/*" ref={audioInputRef} onChange={(e) => setAudio(e.target.files?.[0] || null)} />
              
              {audioPreviewUrl && (
                <div style={{ marginTop: '0.5rem' }}>
                  <audio controls src={audioPreviewUrl} style={{ height: '32px', width: '100%' }} />
                </div>
              )}
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>Reference Image (Optional)</label>
              <input type="file" className="admin-file-input" accept="image/*" ref={imageInputRef} onChange={(e) => setImage(e.target.files?.[0] || null)} />
              
              {imagePreviewUrl && (
                <div style={{ marginTop: '0.5rem' }}>
                  <img src={imagePreviewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
              )}
            </div>
          </div>

          <div className="qf-choices-container">
            <div className="qf-choices-header">
              <label className="qf-choices-title">Player Deductions & Outcomes</label>
              <button type="button" onClick={() => setChoices([...choices, { id: crypto.randomUUID(), text: '', outcomes: defaultOutcomes(), requirements: defaultRequirements() }])} className="btn-secondary" style={{ padding: '0.5rem 1rem', flex: 'none' }}>+ Add Choice</button>
            </div>

            <div className="qf-choices-list">
              {choices.map((choice) => (
                <ChoiceEditorCard 
                  key={choice.id}
                  choice={choice}
                  placeholderText="Intercept deduction / Player choice..."
                  onUpdate={(updatedChoice: ChoiceState) => setChoices(choices.map(c => c.id === choice.id ? updatedChoice : c))}
                  onRemove={() => {
                    if (choices.length <= 2) return setFeedback({ type: 'error', message: 'Minimum two choices required.' });
                    setChoices(choices.filter(c => c.id !== choice.id));
                  }}
                  availableEvidences={availableEvidences}
                  allCaseLevels={allCaseLevels}
                  availableSuspects={availableSuspects}
                  availableVictims={availableVictims}
                  allCaseChoices={allCaseChoices} 
                />
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-cyan)', color: 'var(--bg-dark)' }}>
            {isProcessing ? 'Processing...' : 'Commit Intercept'}
          </button>
        </form>
      </div>

      {selectedLevel && selectedLevel.questions && selectedLevel.questions.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', marginBottom: '1.5rem' }}>// Manage Existing Intercepts</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {selectedLevel.questions.map((q: Question) => (
              <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ overflow: 'hidden', paddingRight: '1rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginRight: '1rem' }}>INT-ID: {q.id}</span>
                  <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '300px', verticalAlign: 'bottom' }}>
                    {q.text}
                  </strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {q.audio_url ? '🎙️ Audio Attached • ' : '📝 Transcript Only • '}
                    {q.choices?.length || 0} Deductions
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                  <button type="button" onClick={() => {
                    if (selectedCase && selectedPhase && selectedLevel) {
                      handleEdit(q, selectedCase.id, selectedPhase.id, selectedLevel.id);
                    }
                  }} className="btn-secondary" style={{ padding: '0.5rem 1rem', borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)' }}>Edit</button>
                  <button type="button" onClick={() => {
                    if (window.confirm("Delete this intercept?")) {
                      if (editingId === q.id) clearForm();
                      deleteMutation.mutate(q.id);
                    }
                  }} className="btn-secondary" style={{ padding: '0.5rem 1rem', borderColor: 'var(--accent-crimson)', color: 'var(--accent-crimson)' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}