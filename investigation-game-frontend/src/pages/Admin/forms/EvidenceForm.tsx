import { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createAdminEvidence, fetchAdminCases } from '@/services/adminApi';
import type { EvidenceType } from '@/types';

export default function EvidenceForm() {
  // 1. Cascading Dropdown State
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [levelId, setLevelId] = useState('');
  
  // 2. Shared Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [paragraph, setParagraph] = useState(''); // Moved up to shared fields
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('document');
  
  // 3. Type-Specific Fields (Media only now)
  const [image, setImage] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Fetch cases and their nested levels
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
      const result = await createAdminEvidence(formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Evidence successfully secured in the database.' });
      setTitle('');
      setDescription('');
      setParagraph('');
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

    const formData = new FormData();
    formData.append('level_id', levelId);
    formData.append('title', title);
    formData.append('evidence_type', evidenceType);
    
    // Always append these so the keys exist in the request (Laravel will convert "" to null)
    formData.append('description', description);
    formData.append('paragraph', paragraph);
    
    // Media remains conditional
    if (evidenceType === 'image' && image) {
      formData.append('image', image);
    }
    if (evidenceType === 'audio' && audio) {
      formData.append('audio', audio);
    }

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
        
        {/* Cascading Dropdowns */}
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
              <option value="" disabled>-- Select a Level --</option>
              {availableLevels.map((l: any) => (
                <option key={l.id} value={l.id}>Phase {l.order_index}: {l.title}</option>
              ))}
            </select>
          </div>
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

        {/* Paragraph is now permanently available in the UI */}
        <div className="form-group">
          <label>Text Content (Markdown Supported)</label>
          <textarea 
            className="admin-textarea"
            placeholder="Use **bold**, *italics*, or `redacted` text..."
            value={paragraph} onChange={(e) => setParagraph(e.target.value)} 
          />
        </div>

        {/* Dynamic Injection Block for Media Only */}
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