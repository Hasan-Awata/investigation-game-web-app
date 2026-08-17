import { type RefObject } from 'react';
import ChoiceEditorCard, { type DraftChoice } from '../Shared/ChoiceEditorCard';

interface AdminWiretapFormProps {
  editingId: number | null;
  text: string;
  setText: (text: string) => void;
  storeLocally: boolean;
  setStoreLocally: (val: boolean) => void;
  imageInputRef: RefObject<HTMLInputElement | null>;
  audioInputRef: RefObject<HTMLInputElement | null>;
  image: File | null;  
  audio: File | null;  
  setImage: (file: File | null) => void;
  setAudio: (file: File | null) => void;
  choices: DraftChoice[];
  addChoice: () => void;
  updateChoice: (index: number, choice: DraftChoice) => void;
  removeChoice: (index: number) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleCancelEdit: () => void;
  isProcessing: boolean;
  statusMessage: { type: 'success' | 'error'; message: string } | null;
  contextHeader: string;
  previewUrl: string | null;
  audioPreviewUrl: string | null;
}

export default function AdminWiretapForm({
  editingId, text, setText, storeLocally, setStoreLocally,
  imageInputRef, audioInputRef, setImage, setAudio, choices, addChoice, updateChoice,
  removeChoice, handleSubmit, handleCancelEdit, isProcessing, statusMessage, contextHeader,
  previewUrl, audioPreviewUrl
}: AdminWiretapFormProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: editingId ? 'var(--accent-amber)' : 'var(--accent-cyan)', margin: '0 0 0.5rem 0' }}>
            {editingId ? `// Editing Wiretap Intercept ID: ${editingId}` : '// Compile Wiretap Intercept'}
          </h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {contextHeader}
          </span>
        </div>
        {editingId && <button type="button" className="btn-secondary" onClick={handleCancelEdit} style={{ padding: '0.5rem 1rem', width: 'auto' }}>Cancel Edit</button>}
      </div>

      {statusMessage && <div className={`status-message ${statusMessage.type}`}>{statusMessage.message}</div>}

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="form-group">
          <label>Intercept Transcript / Prompt Text</label>
          <textarea className="admin-textarea" required value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: '100px' }} placeholder="Transcribe the audio feed or outline the wiretap objectives..." />
        </div>

        <div className="admin-form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>Wiretap Audio Feed (MP3/WAV) {editingId && '(Leave blank to keep existing)'}</label>
            <input type="file" className="admin-file-input" accept="audio/*" ref={audioInputRef} onChange={(e) => setAudio(e.target.files?.[0] || null)} />
            {audioPreviewUrl && (
              <div style={{ marginTop: '0.5rem' }}>
                <audio controls src={audioPreviewUrl} style={{ height: '32px', width: '100%' }} />
              </div>
            )}
          </div>
          
          <div className="form-group" style={{ flex: 1 }}>
            <label>Associated Image / Dossier (Optional)</label>
            <input type="file" className="admin-file-input" accept="image/*" ref={imageInputRef} onChange={(e) => setImage(e.target.files?.[0] || null)} />
            {previewUrl && (
              <div style={{ marginTop: '0.5rem' }}>
                <img src={previewUrl} alt="Preview" style={{ maxHeight: '100px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <input type="checkbox" id="store-locally-toggle" checked={storeLocally} onChange={(e) => setStoreLocally(e.target.checked)} style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-amber)' }} />
          <label htmlFor="store-locally-toggle" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-amber)', cursor: 'pointer' }}>
            <strong>Store Locally on Server:</strong> Save assets directly to public server folders instead of Cloudinary.
          </label>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', margin: 0 }}>Intercept Analysis Choices</h4>
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
              />
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-cyan)', color: 'var(--bg-dark)', marginTop: '2rem' }}>
          {isProcessing ? 'Transmitting...' : editingId ? 'Update Intercept' : 'Commit Intercept to Database'}
        </button>
      </form>
    </div>
  );
}