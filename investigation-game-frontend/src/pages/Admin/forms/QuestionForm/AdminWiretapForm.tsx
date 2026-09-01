import ChoiceEditorCard, { type DraftChoice } from '../Shared/ChoiceEditorCard';
import MediaUploader from '@/pages/Admin/components/MediaUploader';
import type { BaseNodeFormProps } from '@/pages/Admin/utils/questionUtils';

interface AdminWiretapFormProps extends BaseNodeFormProps {
  setImage: (file: File | null) => void;
  setAudio: (file: File | null) => void;
  addChoice: () => void;
  updateChoice: (index: number, choice: DraftChoice) => void;
  removeChoice: (index: number) => void;
}

export default function AdminWiretapForm({
  state, setters, actions, status, previews, setImage, setAudio, addChoice, updateChoice, removeChoice
}: AdminWiretapFormProps) {

  return (
    <div>
      <form onSubmit={actions.handleSubmit} className="admin-form">
        <div className="form-group">
          <label>Intercept Transcript / Prompt Text</label>
          <textarea className="admin-textarea" required value={state.text} onChange={(e) => setters.setText(e.target.value)} style={{ minHeight: '100px' }} />
        </div>

        <div className="admin-form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <MediaUploader 
              label={`Wiretap Audio Feed (MP3/WAV) ${state.editingId ? '(Leave blank to keep existing)' : ''}`} 
              accept="audio/*" 
              ref={actions.registerFileRef('audio')} 
              onChange={setAudio} 
              previewUrl={previews.audio} 
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <MediaUploader 
              label="Associated Image / Dossier (Optional)" 
              accept="image/*" 
              ref={actions.registerFileRef('image')} 
              onChange={setImage} 
              previewUrl={previews.image} 
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <input type="checkbox" id="store-locally-toggle" checked={state.storeLocally} onChange={(e) => setters.setStoreLocally(e.target.checked)} style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-amber)' }} />
          <label htmlFor="store-locally-toggle" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-amber)', cursor: 'pointer' }}><strong>Store Locally on Server</strong></label>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', margin: 0 }}>Intercept Analysis Choices</h4>
            <button type="button" onClick={addChoice} className="btn-secondary" style={{ padding: '0.5rem 1rem', width: 'auto', fontSize: '0.85rem' }}>+ Add Option</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {state.choices.map((choice, index) => (
              <ChoiceEditorCard key={choice.id || index} index={index} choice={choice} updateChoice={(updated) => updateChoice(index, updated)} removeChoice={() => removeChoice(index)} />
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={status.isProcessing} style={{ background: state.editingId ? 'var(--accent-amber)' : 'var(--accent-cyan)', color: 'var(--bg-dark)', marginTop: '2rem' }}>
          {status.isProcessing ? 'Transmitting...' : state.editingId ? 'Update Intercept' : 'Commit Intercept'}
        </button>
      </form>
    </div>
  );
}