import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAdminQuestion, updateAdminQuestion, deleteAdminQuestion, fetchAdminCases } from '@/services/adminApi';
import ChoiceEditorCard, { type DraftChoice } from '../Shared/ChoiceEditorCard';
import type { GameCase, Question, Choice } from '@/types';
import './AdminLocationBuilder.css';

export default function AdminLocationBuilder() {
  const queryClient = useQueryClient();
  
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [phaseId, setPhaseId] = useState<string>(''); 
  const [levelId, setLevelId] = useState<string>('');
  
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
  
  const availableLevels = selectedPhase?.levels?.filter((l) => l.presentation_type === 'location') || [];
  const selectedLevel = availableLevels.find((l) => l.id.toString() === levelId);
  const locationScenes = selectedLevel?.questions || [];

  const clearForm = () => {
    setEditingId(null); setText(''); setIsMandatory(true); setStoreLocally(false);
    setImage(null); setExistingImgUrl(null); setActiveCoordinateTarget(null);
    setAudio(null); setExistingAudioUrl(null);
    setChoices([]);
    setIsFormOpen(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const handleCreateNewScene = () => {
    clearForm();
    setIsFormOpen(true);
    setChoices([{ id: crypto.randomUUID(), text: '', outcomes: {}, requirements: {} }]);
  };

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createAdminQuestion(formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => { setFeedback({ type: 'success', message: 'Scene committed.' }); clearForm(); queryClient.invalidateQueries({ queryKey: ['adminCases'] }); },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number, formData: FormData }) => {
      const result = await updateAdminQuestion(id, formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => { setFeedback({ type: 'success', message: 'Scene updated.' }); clearForm(); queryClient.invalidateQueries({ queryKey: ['adminCases'] }); },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await deleteAdminQuestion(id);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => { setFeedback({ type: 'success', message: 'Scene wiped.' }); queryClient.invalidateQueries({ queryKey: ['adminCases'] }); },
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

    if (choices.some(c => !c.text.trim())) {
      return setFeedback({ type: 'error', message: 'All points must have coordinate mapping text.' });
    }

    choices.forEach((choice, index) => {
      formData.append(`choices[${index}][text]`, choice.text);
      
      if (choice.outcomes) {
        Object.entries(choice.outcomes).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach(v => formData.append(`choices[${index}][outcomes][${key}][]`, String(v)));
          } else if (value !== null && value !== undefined) {
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

  const handleEdit = (scene: Question) => {
    setIsFormOpen(true);
    setEditingId(scene.id); 
    setText(scene.text || ''); 
    setIsMandatory(!!scene.is_mandatory);

    if (scene.choices && scene.choices.length > 0) {
      setChoices(scene.choices.map((c: Choice) => ({
        id: c.id, 
        text: c.text,
        requirements: c.requirements || {},
        outcomes: c.outcomes || {}
      })));
    } else {
      setChoices([]);
    }

    setImage(null); setExistingImgUrl(scene.img_url || null); setActiveCoordinateTarget(null);
    setAudio(null); setExistingAudioUrl(scene.audio_url || null);
    
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isProcessing = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const previewUrl = image ? URL.createObjectURL(image) : existingImgUrl;
  const audioPreviewUrl = audio ? URL.createObjectURL(audio) : existingAudioUrl;

  return (
    <div className="location-builder-container">
      <div className="admin-form-container glass-panel" style={{ padding: '1.5rem', marginBottom: '0' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', margin: '0 0 1.5rem 0' }}>// Visual Location Editor</h3>
        <div className="admin-form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>Target Case</label>
            <select className="admin-input" required value={selectedCaseId} disabled={isFetchingCases} onChange={(e) => { setSelectedCaseId(e.target.value); setPhaseId(''); setLevelId(''); clearForm(); }}>
              <option value="" disabled>-- Select Case --</option>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Target Phase</label>
            <select className="admin-input" required value={phaseId} disabled={!selectedCaseId} onChange={(e) => { setPhaseId(e.target.value); setLevelId(''); clearForm(); }}>
              <option value="" disabled>-- Select Phase --</option>
              {availablePhases.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Location Level</label>
            <select className="admin-input" required value={levelId} onChange={(e) => { setLevelId(e.target.value); clearForm(); }} disabled={!phaseId}>
              <option value="" disabled>-- Select Location --</option>
              {availableLevels.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          </div>
        </div>
      </div>

      {levelId && !isFormOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', margin: 0 }}>Location Scenes</h3>
            <button className="btn-primary" style={{ width: 'auto', padding: '0.75rem 2rem' }} onClick={handleCreateNewScene}>
              + Append New Scene
            </button>
          </div>
          
          {locationScenes.length === 0 ? (
            <div className="terminal-text" style={{ textAlign: 'left', padding: '2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>No scenes configured for this location yet. Click above to initialize one.</div>
          ) : (
            locationScenes.map((scene: Question) => (
              <div key={scene.id} className="scene-item-card glass-panel">
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div className="scene-thumbnail" style={{ backgroundImage: `url(${scene.img_url || '/placeholder-crime-scene.jpg'})` }} />
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontSize: '0.8rem' }}>SCENE ID: {scene.id}</span>
                    <h4 style={{ margin: '0.25rem 0', color: 'var(--text-primary)' }}>{scene.text || 'Unnamed Scene'}</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{scene.choices?.length || 0} Interactable Points Mapped</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" onClick={() => handleEdit(scene)} className="btn-secondary" style={{ borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)' }}>Edit Map</button>
                  <button type="button" onClick={() => { if(window.confirm('Delete scene?')) deleteMutation.mutate(scene.id); }} className="btn-secondary" style={{ borderColor: 'var(--accent-crimson)', color: 'var(--accent-crimson)' }}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {isFormOpen && (
        <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginTop: '1rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-mono)', color: editingId ? 'var(--accent-amber)' : 'var(--accent-cyan)', margin: 0 }}>
                {editingId ? `// Editing Scene ID: ${editingId}` : '// Compile New Scene'}
              </h3>
              <button type="button" className="btn-secondary" onClick={clearForm} style={{ padding: '0.5rem 1rem', width: 'auto' }}>Return to Overview</button>
            </div>

            {feedback && <div className={`status-message ${feedback.type}`}>{feedback.message}</div>}

            <form onSubmit={handleSubmit} className="admin-form">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: isMandatory ? 'rgba(0, 229, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: `1px solid ${isMandatory ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`, transition: 'all 0.2s ease' }}>
                <input type="checkbox" id="mandatory-toggle" checked={isMandatory} onChange={(e) => setIsMandatory(e.target.checked)} style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-cyan)' }} />
                <label htmlFor="mandatory-toggle" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: isMandatory ? 'var(--accent-cyan)' : 'var(--text-secondary)', cursor: 'pointer', margin: 0 }}>
                  <strong>Mandatory Scene:</strong> Required for phase completion. Uncheck if this is just a transitional room.
                </label>
              </div>

              <div className="form-group">
                <label>Scene Title / Hint Text</label>
                <textarea className="admin-textarea" style={{ minHeight: '80px' }} required value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe the overview of this environment zone..." />
              </div>

              <div className="admin-form-row" style={{ marginTop: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Environment Map (Image)</label>
                  <input type="file" className="admin-file-input" accept="image/*" ref={imageInputRef} onChange={(e) => setImage(e.target.files?.[0] || null)} />
                </div>
                
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Ambient Audio / Dialogue (Optional)</label>
                  <input type="file" className="admin-file-input" accept="audio/*" ref={audioInputRef} onChange={(e) => setAudio(e.target.files?.[0] || null)} />
                  
                  {audioPreviewUrl && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                        {audio ? 'New Audio Selected:' : 'Existing Audio:'}
                      </p>
                      <audio controls src={audioPreviewUrl} style={{ height: '32px', width: '100%' }} />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <input type="checkbox" id="store-locally-toggle" checked={storeLocally} onChange={(e) => setStoreLocally(e.target.checked)} style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-amber)' }} />
                <label htmlFor="store-locally-toggle" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-amber)', cursor: 'pointer', margin: 0 }}>
                  <strong>Store Locally on Server</strong>
                </label>
              </div>

              {previewUrl ? (
                <div className="coordinate-picker-container" style={{ marginTop: '1.5rem' }}>
                  {activeCoordinateTarget && (
                    <div className="targeting-active-banner">
                      <span>⚠️ TARGETING MATRIX ENGAGED: Click anywhere on the map below to lock target coordinates.</span>
                      <button type="button" onClick={() => setActiveCoordinateTarget(null)} style={{ background: 'transparent', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Cancel</button>
                    </div>
                  )}
                  <div className="coordinate-picker-header">
                    <div>
                      <label style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>Visual Coordinate Mapping Matrix</label>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {activeCoordinateTarget ? 'Click the blueprint image to pin location.' : 'Click "MAP COORDINATES" on any point item below.'}
                      </p>
                    </div>
                  </div>
                  <div className={`coordinate-picker-image-wrapper ${activeCoordinateTarget ? 'mapping-active' : ''}`} onClick={handleImageClick}>
                    <img src={previewUrl} alt="Map Preview" />
                  </div>
                </div>
              ) : (
                <div className="terminal-text" style={{ padding: '1.5rem', border: '1px dashed rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '1.5rem', borderRadius: '6px', color: 'var(--text-secondary)' }}>
                  Upload an Environment Map above to activate the visual coordinate targeting matrix.
                </div>
              )}

              <div className="qf-choices-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {choices.map((choice, index) => (
                  <ChoiceEditorCard 
                    key={choice.id}
                    index={index}
                    choice={choice}
                    updateChoice={(updated) => setChoices(choices.map(c => c.id === choice.id ? updated : c))}
                    removeChoice={() => setChoices(choices.filter(c => c.id !== choice.id))}
                    caseId={Number(selectedCaseId)}
                    isLocationMode={true}
                    isTargeting={activeCoordinateTarget === choice.id}
                    onToggleTarget={() => setActiveCoordinateTarget(activeCoordinateTarget === choice.id ? null : (choice.id ?? null))}                  />
                ))}
                {choices.length === 0 && <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', padding: '1rem', background: 'rgba(0,0,0,0.1)', borderRadius: '6px' }}>No points mapped. Add a point to allow spatial inspection.</div>}
              </div>

              <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-cyan)', color: 'var(--bg-dark)', marginTop: '2rem' }}>
                {isProcessing ? 'Processing...' : 'Commit Scene Layout'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}