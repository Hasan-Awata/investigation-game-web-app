import ChoiceEditorCard from '../Shared/ChoiceEditorCard';
import AdminFormHeader from '../Shared/AdminFormHeader';
import type { BaseNodeFormProps } from '@/utils/questionUtils';
import { AdminFileInput } from '@/components/AdminUI';
import { validateImageSize } from '@/utils/fileValidation';

interface AdminLocationFormProps extends BaseNodeFormProps {
  setImage: (file: File | null) => void;
  activeCoordinateTarget: string | number | null;
  setActiveCoordinateTarget: (val: string | number | null) => void;
  handleImageClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  contextHeader: string;
}

export default function AdminLocationForm({
  state, setters, actions, status, previews, setImage, activeCoordinateTarget, setActiveCoordinateTarget, handleImageClick, contextHeader
}: AdminLocationFormProps) {

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImage(file && validateImageSize(file) ? file : null);
  };

  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginTop: '1rem' }}>
      <div>
        <AdminFormHeader editingId={state.editingId} entityName="Scene" contextHeader={contextHeader} onCancel={actions.handleCancel} />
        {status.feedback && <div className={`status-message ${status.feedback.type}`}>{status.feedback.message}</div>}

        <form onSubmit={actions.handleSubmit} className="admin-form">
          <div className="form-group">
            <label>Scene Title / Hint Text</label>
            <textarea className="admin-textarea" style={{ minHeight: '80px' }} required value={state.text} onChange={(e) => setters.setText(e.target.value)} />
          </div>

          <div className="admin-form-row" style={{ marginTop: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <AdminFileInput label="Environment Map (Image)" accept="image/*" ref={actions.registerFileRef('image')} onChange={handleImageChange} />
            </div>
          </div>

          {/* Rendering the targeting UI */}
          {previews.image && (
            <div className="coordinate-picker-container" style={{ marginTop: '1.5rem' }}>
              {activeCoordinateTarget && (
                <div className="targeting-active-banner">
                  <span>⚠️ TARGETING MATRIX ENGAGED: Click map to lock.</span>
                  <button type="button" onClick={() => setActiveCoordinateTarget(null)} style={{ background: 'transparent', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)' }}>Cancel</button>
                </div>
              )}
              <div className={`coordinate-picker-image-wrapper ${activeCoordinateTarget ? 'mapping-active' : ''}`} onClick={handleImageClick}>
                <img src={previews.image} alt="Map Preview" />
              </div>
            </div>
          )}

          <div className="qf-choices-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
            {state.choices.map((choice, index) => (
              <ChoiceEditorCard key={choice.id || index} index={index} choice={choice} updateChoice={(updated) => setters.setChoices(state.choices.map(c => c.id === choice.id ? updated : c))} removeChoice={() => setters.setChoices(state.choices.filter(c => c.id !== choice.id))} />
            ))}
          </div>

          <button type="button" onClick={() => setters.setChoices([...state.choices, { id: crypto.randomUUID(), text: '', outcomes: {}, requirements: {} }])} className="btn-secondary" style={{ padding: '0.75rem', width: '100%', marginTop: '1rem' }}>
            + Map New Coordinate Point
          </button>

          <button type="submit" className="btn-primary" disabled={status.isProcessing} style={{ background: state.editingId ? 'var(--accent-amber)' : 'var(--accent-cyan)', color: 'var(--bg-dark)', marginTop: '2rem' }}>
            {status.isProcessing ? 'Processing...' : 'Commit Scene Layout'}
          </button>
        </form>
      </div>
    </div>
  );
}