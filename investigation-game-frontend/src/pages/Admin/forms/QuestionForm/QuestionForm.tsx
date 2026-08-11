import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAdminQuestion, updateAdminQuestion, deleteAdminQuestion, fetchAdminCases } from '@/services/adminApi';
import './QuestionForm.css';

// --- TYPES ---
interface ChoiceOutcomes {
  feedback: string;
  next_question_id: string;
  gives_strike: boolean;
  unlock_evidence: string[];
  unlock_levels: string[];
  unlock_suspects: string[];
  unlock_victims: string[];
}

interface ChoiceRequirements {
  required_evidence: string[];
  required_choices: string[];
}

interface ChoiceState {
  id: string; 
  text: string;
  outcomes: ChoiceOutcomes; 
  requirements: ChoiceRequirements; 
}

const defaultRequirements = (): ChoiceRequirements => ({ required_evidence: [], required_choices: [] });

const defaultOutcomes = (): ChoiceOutcomes => ({
  feedback: '', next_question_id: '', gives_strike: false,
  unlock_evidence: [], unlock_levels: [], unlock_suspects: [], unlock_victims: [],
});

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

// --- SUB-COMPONENT: Choice Editor Card ---
const ChoiceEditorCard = ({ 
  choice, isLocationPhase, isActiveTarget, onToggleTarget, onUpdate, onRemove, 
  availableEvidences, allCaseLevels, availableSuspects, availableVictims, allCaseChoices 
}: any) => {
  const [isExpanded, setIsExpanded] = useState(!choice.text);

  const updateField = (field: 'text', val: any) => onUpdate({ ...choice, [field]: val });
  const updateOutcome = (field: keyof ChoiceOutcomes, val: any) => onUpdate({ ...choice, outcomes: { ...choice.outcomes, [field]: val } });
  const updateRequirement = (field: keyof ChoiceRequirements, val: any) => onUpdate({ ...choice, requirements: { ...choice.requirements, [field]: val } });

  const handleMultiSelect = (e: React.ChangeEvent<HTMLSelectElement>, field: string, isReq = false) => {
    const values = Array.from(e.target.selectedOptions, opt => opt.value);
    if (isReq) updateRequirement(field as keyof ChoiceRequirements, values);
    else updateOutcome(field as keyof ChoiceOutcomes, values);
  };

  return (
    <div className={`qf-choice-row ${isActiveTarget ? 'picking-target' : ''}`}>
      <div className="qf-choice-top" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        
        <button 
          type="button" 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem', padding: '0.5rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          ▶
        </button>

        <input type="text" className="admin-input qf-choice-text-input" required placeholder="Choice text..." value={choice.text} onChange={(e) => updateField('text', e.target.value)} />
        
        {isLocationPhase && (
          <button type="button" className={`pick-point-btn ${isActiveTarget ? 'active' : ''}`} onClick={onToggleTarget}>🎯</button>
        )}
        <button type="button" className="qf-delete-btn" onClick={onRemove}>×</button>
      </div>
      
      {isExpanded && (
        <div className={`qf-choice-bottom ${!isLocationPhase ? 'indented' : ''}`} style={{ animation: 'fadeIn 0.2s ease-out' }}>
          
          <div className="qf-outcomes-builder" style={{ borderColor: 'var(--text-secondary)', marginBottom: '1rem' }}>
            <label className="qf-outcome-label" style={{ color: 'var(--text-secondary)' }}>Lock Requirements (Detroit Branching)</label>
            <div className="qf-outcomes-grid">
              <div className="qf-outcome-group">
                <label className="qf-outcome-label">Requires Evidence (Ctrl+Click)</label>
                <select multiple className="admin-input qf-multi-select" value={choice.requirements.required_evidence} onChange={(e) => handleMultiSelect(e, 'required_evidence', true)}>
                  {availableEvidences.map((ev: any) => <option key={ev.id} value={ev.id}>EX-{ev.id} {ev.title}</option>)}
                </select>
              </div>
              <div className="qf-outcome-group">
                <label className="qf-outcome-label">Requires Past Choice (Ctrl+Click)</label>
                <select 
                  multiple 
                  className="admin-input qf-multi-select" 
                  value={choice.requirements.required_choices} 
                  onChange={(e) => handleMultiSelect(e, 'required_choices', true)}
                >
                  {allCaseChoices.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      [{c.level_title}] {c.question_text.substring(0, 25)}... ➔ {c.text}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="qf-outcomes-builder">
            <div className="qf-outcome-group">
              <label className="qf-outcome-label">Custom Feedback Message</label>
              <input type="text" className="admin-input" placeholder="e.g., I found something useful here." value={choice.outcomes.feedback} onChange={(e) => updateOutcome('feedback', e.target.value)} />
            </div>

            <div className="qf-outcome-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem', background: choice.outcomes.gives_strike ? 'rgba(163, 50, 50, 0.15)' : 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: '4px', border: `1px solid ${choice.outcomes.gives_strike ? 'rgba(163, 50, 50, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`, marginTop: '0.5rem', transition: 'all 0.2s ease' }}>
              <input type="checkbox" checked={choice.outcomes.gives_strike} onChange={(e) => updateOutcome('gives_strike', e.target.checked)} style={{ transform: 'scale(1.2)', accentColor: 'var(--accent-crimson)', cursor: 'pointer' }} />
              <label className="qf-outcome-label" style={{ color: choice.outcomes.gives_strike ? 'var(--accent-crimson)' : 'var(--text-secondary)', margin: 0, cursor: 'pointer' }} onClick={() => updateOutcome('gives_strike', !choice.outcomes.gives_strike)}>
                Triggers Department Strike (Penalty)
              </label>
            </div>

            <div className="qf-outcomes-grid" style={{ marginTop: '0.5rem' }}>
              <div className="qf-outcome-group">
                <label className="qf-outcome-label">Next Node ID (Branching)</label>
                <input type="number" className="admin-input" placeholder="Question ID" value={choice.outcomes.next_question_id} onChange={(e) => updateOutcome('next_question_id', e.target.value)} />
              </div>
              <div className="qf-outcome-group">
                <label className="qf-outcome-label">Unlock Evidence</label>
                <select multiple className="admin-input qf-multi-select" value={choice.outcomes.unlock_evidence} onChange={(e) => handleMultiSelect(e, 'unlock_evidence')}>
                  {availableEvidences.map((ev: any) => <option key={ev.id} value={ev.id}>EX-{ev.id} {ev.title}</option>)}
                </select>
              </div>
              <div className="qf-outcome-group">
                <label className="qf-outcome-label">Unlock Phase / Level</label>
                <select multiple className="admin-input qf-multi-select" value={choice.outcomes.unlock_levels} onChange={(e) => handleMultiSelect(e, 'unlock_levels')}>
                  {allCaseLevels.map((l: any) => <option key={l.id} value={l.id}>{l.phase_title}: {l.title}</option>)}
                </select>
              </div>
              <div className="qf-outcome-group">
                <label className="qf-outcome-label">Unlock Suspect</label>
                <select multiple className="admin-input qf-multi-select" value={choice.outcomes.unlock_suspects} onChange={(e) => handleMultiSelect(e, 'unlock_suspects')}>
                  {availableSuspects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="qf-outcome-group">
                <label className="qf-outcome-label">Unlock Victim</label>
                <select multiple className="admin-input qf-multi-select" value={choice.outcomes.unlock_victims} onChange={(e) => handleMultiSelect(e, 'unlock_victims')}>
                  {availableVictims.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function QuestionForm() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);

  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [phaseId, setPhaseId] = useState(''); 
  const [levelId, setLevelId] = useState('');
  
  const [text, setText] = useState('');
  const [isMandatory, setIsMandatory] = useState(true); 
  const [storeLocally, setStoreLocally] = useState(false);
  
  const [image, setImage] = useState<File | null>(null);
  const [existingImgUrl, setExistingImgUrl] = useState<string | null>(null);

  const [audio, setAudio] = useState<File | null>(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(null);
  
  const [activeCoordinateTarget, setActiveCoordinateTarget] = useState<string | null>(null);
  
  const [choices, setChoices] = useState<ChoiceState[]>([
    { id: crypto.randomUUID(), text: '', outcomes: defaultOutcomes(), requirements: defaultRequirements() },
    { id: crypto.randomUUID(), text: '', outcomes: defaultOutcomes(), requirements: defaultRequirements() }
  ]);
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

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

  const availableEvidences = selectedCase?.evidences || [];
  const availableSuspects = selectedCase?.suspects || [];
  const availableVictims = selectedCase?.victims || [];
  const allCaseLevels = availablePhases.flatMap((p: any) => p.levels?.map((l: any) => ({ ...l, phase_title: p.title })) || []);

  const allCaseChoices = allCaseLevels.flatMap((l: any) => 
    (l.questions || []).flatMap((q: any) => 
      (q.choices || []).map((c: any) => ({
        id: c.id,
        text: c.text,
        question_text: q.text,
        level_title: l.title
      }))
    )
  );

  const clearForm = () => {
    setEditingId(null); setText(''); setIsMandatory(true); setStoreLocally(false);
    setImage(null); setExistingImgUrl(null); setActiveCoordinateTarget(null);
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
    onSuccess: () => { setFeedback({ type: 'success', message: 'Question committed.' }); clearForm(); queryClient.invalidateQueries({ queryKey: ['adminCases'] }); },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number, formData: FormData }) => {
      const result = await updateAdminQuestion(id, formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => { setFeedback({ type: 'success', message: 'Question updated.' }); clearForm(); queryClient.invalidateQueries({ queryKey: ['adminCases'] }); },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await deleteAdminQuestion(id);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => { setFeedback({ type: 'success', message: 'Question wiped.' }); queryClient.invalidateQueries({ queryKey: ['adminCases'] }); },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

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
    setFeedback(null);

    const formData = new FormData();
    formData.append('level_id', levelId); 
    formData.append('text', text);
    formData.append('is_mandatory', isMandatory ? '1' : '0'); 
    formData.append('store_locally', storeLocally ? '1' : '0');
    if (image) formData.append('image', image);
    if (audio) formData.append('audio', audio);

    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      if (!choice.text.trim()) return setFeedback({ type: 'error', message: 'All choices must have text.' });
      
      formData.append(`choices[${i}][text]`, choice.text);
      
      const cleanReqs: any = {};
      if (choice.requirements.required_evidence.length > 0) cleanReqs.required_evidence = choice.requirements.required_evidence.map(Number);
      if (choice.requirements.required_choices.length > 0) cleanReqs.required_choices = choice.requirements.required_choices.map(Number);
      if (Object.keys(cleanReqs).length > 0) appendToFormData(formData, `choices[${i}][requirements]`, cleanReqs);

      const cleanOutcomes: any = {};
      if (choice.outcomes.gives_strike) cleanOutcomes.gives_strike = true;
      if (choice.outcomes.feedback.trim()) cleanOutcomes.feedback = choice.outcomes.feedback.trim();
      if (choice.outcomes.next_question_id.trim()) cleanOutcomes.next_question_id = parseInt(choice.outcomes.next_question_id, 10);
      if (choice.outcomes.unlock_evidence.length > 0) cleanOutcomes.unlock_evidence = choice.outcomes.unlock_evidence.map(Number);
      if (choice.outcomes.unlock_levels.length > 0) cleanOutcomes.unlock_levels = choice.outcomes.unlock_levels.map(Number);
      if (choice.outcomes.unlock_suspects.length > 0) cleanOutcomes.unlock_suspects = choice.outcomes.unlock_suspects.map(Number);
      if (choice.outcomes.unlock_victims.length > 0) cleanOutcomes.unlock_victims = choice.outcomes.unlock_victims.map(Number);
      if (Object.keys(cleanOutcomes).length > 0) appendToFormData(formData, `choices[${i}][outcomes]`, cleanOutcomes);
    }

    if (editingId) updateMutation.mutate({ id: editingId, formData });
    else createMutation.mutate(formData);
  };

  const handleEdit = (question: any, parentCaseId: number, parentPhaseId: number, parentLevelId: number) => {
    setEditingId(question.id); setSelectedCaseId(parentCaseId.toString());
    setPhaseId(parentPhaseId.toString()); setLevelId(parentLevelId.toString());
    setText(question.text); setIsMandatory(!!question.is_mandatory);

    if (question.choices && question.choices.length > 0) {
      setChoices(question.choices.map((c: any) => ({
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

    setImage(null); setExistingImgUrl(question.img_url || null); setActiveCoordinateTarget(null);
    setAudio(null); setExistingAudioUrl(question.audio_url || null);
    
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isProcessing = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const previewUrl = image ? URL.createObjectURL(image) : existingImgUrl;
  const audioPreviewUrl = audio ? URL.createObjectURL(audio) : existingAudioUrl;

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

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: isMandatory ? 'rgba(0, 229, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: `1px solid ${isMandatory ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`, transition: 'all 0.2s ease' }}>
            <input type="checkbox" id="mandatory-toggle" checked={isMandatory} onChange={(e) => setIsMandatory(e.target.checked)} style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-cyan)' }} />
            <label htmlFor="mandatory-toggle" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: isMandatory ? 'var(--accent-cyan)' : 'var(--text-secondary)', cursor: 'pointer', margin: 0 }}>
              <strong>Mandatory Verdict:</strong> Players must resolve this node to clear the phase. (Uncheck for optional lore/evidence sweeps).
            </label>
          </div>

          <div className="form-group">
            <label>Question Text</label>
            <textarea className="admin-textarea" required value={text} onChange={(e) => setText(e.target.value)} />
          </div>

          <div className="admin-form-row" style={{ marginTop: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Question Image (Location Angle / Reference)</label>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                This image will be used as the interactive map for Location Phases, or as a visual aid for standard questions. Max 4MB.
              </p>
              <input type="file" className="admin-file-input" accept="image/*" ref={imageInputRef} onChange={(e) => setImage(e.target.files?.[0] || null)} />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>Question Audio (Wiretap Feed / Narrative)</label>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                Upload intercept recordings here. Optimal: MP3 or WAV. Max 10MB.
              </p>
              <input type="file" className="admin-file-input" accept="audio/*" ref={audioInputRef} onChange={(e) => setAudio(e.target.files?.[0] || null)} />
              
              {/* LIVE AUDIO PREVIEW PLAYER */}
              {audioPreviewUrl && (
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                    {audio ? 'New Audio Selected:' : 'Existing Intercept Audio:'}
                  </p>
                  <audio controls src={audioPreviewUrl} style={{ height: '32px', width: '100%' }} />
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <input type="checkbox" id="store-locally-toggle" checked={storeLocally} onChange={(e) => setStoreLocally(e.target.checked)} style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-amber)' }} />
            <label htmlFor="store-locally-toggle" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-amber)', cursor: 'pointer', margin: 0 }}>
              <strong>Store Locally on Server:</strong> Save assets directly to public server folders instead of Cloudinary.
            </label>
          </div>

          {isLocationPhase && previewUrl ? (
            <div className="coordinate-picker-container" style={{ marginTop: '1.5rem' }}>
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
          ) : isLocationPhase ? (
            <div className="terminal-text" style={{ padding: '1rem', border: '1px dashed rgba(255,255,255,0.2)', textAlign: 'left', marginTop: '1.5rem' }}>
              Upload a Question Image above to enable the interactive coordinate mapper.
            </div>
          ) : null}

          <div className="qf-choices-container">
            <div className="qf-choices-header">
              <label className="qf-choices-title">Dialogue & Outcomes</label>
              <button type="button" onClick={() => setChoices([...choices, { id: crypto.randomUUID(), text: '', outcomes: defaultOutcomes(), requirements: defaultRequirements() }])} className="btn-secondary" style={{ padding: '0.5rem 1rem', flex: 'none' }}>+ Add Choice</button>
            </div>

            <div className="qf-choices-list">
              {choices.map((choice) => (
                <ChoiceEditorCard 
                  key={choice.id}
                  choice={choice}
                  isLocationPhase={isLocationPhase}
                  isActiveTarget={activeCoordinateTarget === choice.id}
                  onToggleTarget={(e: any) => {
                    e.stopPropagation();
                    setActiveCoordinateTarget(activeCoordinateTarget === choice.id ? null : choice.id);
                  }}
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

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', color: 'var(--bg-dark)' }}>
            {isProcessing ? 'Processing...' : 'Commit Question'}
          </button>
        </form>
      </div>

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
                  <button type="button" onClick={() => handleEdit(q, selectedCase.id, selectedPhase.id, selectedLevel.id)} className="btn-secondary" style={{ padding: '0.5rem 1rem', borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)' }}>Edit</button>
                  <button type="button" onClick={() => {
                    if (window.confirm("Delete this question?")) {
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