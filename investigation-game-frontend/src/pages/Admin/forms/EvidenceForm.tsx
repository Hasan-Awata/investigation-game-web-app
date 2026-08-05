import { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createAdminEvidence, fetchAdminCases } from '@/services/adminApi';
import type { EvidenceType } from '@/types';

export default function EvidenceForm() {
  const [caseId, setCaseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [paragraph, setParagraph] = useState('');
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('document');
  const [isInitial, setIsInitial] = useState(true);
  const [isVitalForConviction, setIsVitalForConviction] = useState(false); // Unified naming
  
  const [image, setImage] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
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

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createAdminEvidence(formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Evidence successfully secured in the database.' });
      setTitle('');
      setDescription('');
      setParagraph('');
      setIsInitial(true);
      setIsVitalForConviction(false); // Unified naming
      setImage(null);
      setAudio(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (audioInputRef.current) audioInputRef.current.value = '';
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!caseId) {
      setFeedback({ type: 'error', message: 'You must select a target case.' });
      return;
    }

    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('title', title);
    formData.append('evidence_type', evidenceType);
    formData.append('description', description);
    formData.append('paragraph', paragraph);
    formData.append('is_initial', isInitial ? '1' : '0');
    formData.append('is_vital_for_conviction', isVitalForConviction ? '1' : '0'); // Unified naming
    
    if (evidenceType === 'image' && image) formData.append('image', image);
    if (evidenceType === 'audio' && audio) formData.append('audio', audio);

    mutation.mutate(formData);
  };

  const renderTypeSpecificFields = () => {
    switch (evidenceType) {
      case 'image':
        return (
          <div className="form-group">
            <label>Evidence Image</label>
            <input 
              type="file" className="admin-file-input" accept="image/*" required
              ref={imageInputRef}
              onChange={(e) => setImage(e.target.files?.[0] || null)} 
            />
          </div>
        );
      case 'audio':
        return (
          <div className="form-group">
            <label>Audio Recording</label>
            <input 
              type="file" className="admin-file-input" accept="audio/*" required
              ref={audioInputRef}
              onChange={(e) => setAudio(e.target.files?.[0] || null)} 
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="admin-form-container glass-panel">
      {feedback && (
        <div className={`status-message ${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label>Target Case</label>
          <select 
            className="admin-input" required
            value={caseId} 
            onChange={(e) => setCaseId(e.target.value)} 
            disabled={isFetchingCases}
          >
            <option value="" disabled>-- Select a Case --</option>
            {cases.map((c: any) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <input 
            type="checkbox" id="initial-toggle"
            checked={isInitial} onChange={(e) => setIsInitial(e.target.checked)}
            style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-cyan)' }}
          />
          <label htmlFor="initial-toggle" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <strong>Initial Evidence:</strong> This item will be available on the board immediately when the case starts. (Uncheck if this is unlocked via player choices later).
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(163,50,50,0.1)', border: '1px solid rgba(163,50,50,0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <input 
            type="checkbox" id="vital-toggle"
            checked={isVitalForConviction} onChange={(e) => setIsVitalForConviction(e.target.checked)} // Unified naming
            style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-crimson)' }}
          />
          <label htmlFor="vital-toggle" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', cursor: 'pointer' }}>
            <strong>Vital Evidence:</strong> This item is strictly required to secure a conviction. The DA will throw out the case if this proof is not unlocked by the team.
          </label>
        </div>

        <div className="form-group">
          <label>Evidence Category</label>
          <select 
            className="admin-input" 
            value={evidenceType} 
            onChange={(e) => {
              setEvidenceType(e.target.value as EvidenceType);
              setFeedback(null); 
            }}
          >
            <option value="document">Written Document</option>
            <option value="testimony">Witness Testimony</option>
            <option value="audio">Audio Recording</option>
            <option value="image">Photographic Evidence</option>
            <option value="forensic">Forensic Report</option>
          </select>
        </div>

        <div className="form-group">
          <label>Evidence Title</label>
          <input 
            type="text" className="admin-input" required
            value={title} onChange={(e) => setTitle(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label>Short Description (Optional)</label>
          <input 
            type="text" className="admin-input"
            value={description} onChange={(e) => setDescription(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label>Text Content (Markdown Supported)</label>
          <textarea 
            className="admin-textarea"
            placeholder="Use **bold**, *italics*, or `redacted` text..."
            value={paragraph} onChange={(e) => setParagraph(e.target.value)} 
          />
        </div>

        {(evidenceType === 'image' || evidenceType === 'audio') && (
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px' }}>
            {renderTypeSpecificFields()}
          </div>
        )}

        <button 
          type="submit" 
          className="btn-primary" 
          disabled={mutation.isPending}
          style={{ background: 'var(--accent-crimson)', marginTop: '1rem' }}
        >
          {mutation.isPending ? 'Encrypting Data...' : 'Commit Evidence to Database'}
        </button>
      </form>
    </div>
  );
}