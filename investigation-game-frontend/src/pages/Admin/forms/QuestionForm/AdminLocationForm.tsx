import { type RefObject } from 'react';
import ChoiceEditorCard, { type DraftChoice } from '../Shared/ChoiceEditorCard';

interface AdminLocationFormProps {
  editingId: number | null;
  text: string;
  setText: (text: string) => void;
  storeLocally: boolean;
  setStoreLocally: (val: boolean) => void;
  imageInputRef: RefObject<HTMLInputElement | null>;
  audioInputRef: RefObject<HTMLInputElement | null>;
  setImage: (file: File | null) => void;
  setAudio: (file: File | null) => void;
  choices: DraftChoice[];
  setChoices: (choices: DraftChoice[]) => void;
  activeCoordinateTarget: string | number | null;
  setActiveCoordinateTarget: (val: string | number | null) => void;
  handleImageClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleCancelEdit: () => void;
  isProcessing: boolean;
  statusMessage: { type: 'success' | 'error'; message: string } | null;
  contextHeader: string;
  previewUrl: string | null;
  audioPreviewUrl: string | null;
}

export default function AdminLocationForm({
  editingId, text, setText, storeLocally, setStoreLocally,
  imageInputRef, setImage, choices, setChoices, 
  activeCoordinateTarget, setActiveCoordinateTarget, handleImageClick,
  handleSubmit, handleCancelEdit, isProcessing, statusMessage, contextHeader,
  previewUrl
}: AdminLocationFormProps) {
  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginTop: '1rem' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-mono)', color: editingId ? 'var(--accent-amber)' : 'var(--accent-cyan)', margin: '0 0 0.5rem 0' }}>
              {editingId ? `// Editing Scene ID: ${editingId}` : '// Compile New Scene'}
            </h3>
            {/* ADDED MISSING CONTEXT HEADER HERE */}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {contextHeader}
            </span>
          </div>
          <button type="button" className="btn-secondary" onClick={handleCancelEdit} style={{ padding: '0.5rem 1rem', width: 'auto' }}>
            Return to Overview
          </button>
        </div>

        {statusMessage && <div className={`status-message ${statusMessage.type}`}>{statusMessage.message}</div>}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label>Scene Title / Hint Text</label>
            <textarea className="admin-textarea" style={{ minHeight: '80px' }} required value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe the overview of this environment zone..." />
          </div>

          <div className="admin-form-row" style={{ marginTop: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Environment Map (Image)</label>
              <input type="file" className="admin-file-input" accept="image/*" ref={imageInputRef} onChange={(e) => setImage(e.target.files?.[0] || null)} />
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

          <div className="qf-choices-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
            {choices.map((choice) => (
              <ChoiceEditorCard 
                key={choice.id}
                index={choices.findIndex(c => c.id === choice.id)}
                choice={choice}
                updateChoice={(updated) => setChoices(choices.map(c => c.id === choice.id ? updated : c))}
                removeChoice={() => setChoices(choices.filter(c => c.id !== choice.id))}
                isLocationMode={true}
                isTargeting={activeCoordinateTarget === choice.id}
                onToggleTarget={() => setActiveCoordinateTarget(activeCoordinateTarget === choice.id ? null : (choice.id ?? null))}
              />
            ))}
            {choices.length === 0 && <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', padding: '1rem', background: 'rgba(0,0,0,0.1)', borderRadius: '6px' }}>No points mapped. Add a point to allow spatial inspection.</div>}
          </div>

          <button type="button" onClick={() => setChoices([...choices, { id: crypto.randomUUID(), text: '', outcomes: {}, requirements: {} }])} className="btn-secondary" style={{ padding: '0.75rem', width: '100%', marginTop: '1rem' }}>
            + Map New Coordinate Point
          </button>

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-cyan)', color: 'var(--bg-dark)', marginTop: '2rem' }}>
            {isProcessing ? 'Processing...' : 'Commit Scene Layout'}
          </button>
        </form>
      </div>
    </div>
  );
}