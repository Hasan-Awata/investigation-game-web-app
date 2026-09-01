import ChoiceEditorCard from '../Shared/ChoiceEditorCard';
import MediaUploader from '@/pages/Admin/components/MediaUploader';
import type { BaseNodeFormProps } from '@/pages/Admin/utils/questionUtils';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';

interface AdminLocationFormProps extends BaseNodeFormProps {
  setImage: (file: File | null) => void;
  activeCoordinateTarget: string | number | null;
  setActiveCoordinateTarget: (val: string | number | null) => void;
  handleImageClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function AdminLocationForm({
  state, setters, actions, status, previews, setImage, activeCoordinateTarget, setActiveCoordinateTarget, handleImageClick
}: AdminLocationFormProps) {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.locationForm;

  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <form onSubmit={actions.handleSubmit} className="admin-form">
        <div className="form-group">
          <label>{t.sceneTitleLabel}</label>
          <textarea className="admin-textarea" style={{ minHeight: '80px' }} required value={state.text} onChange={(e) => setters.setText(e.target.value)} />
        </div>

        <div className="admin-form-row" style={{ marginTop: '1rem' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <MediaUploader
              label={t.envMapLabel}
              accept="image/*"
              maxSizeMB={10}
              ref={actions.registerFileRef('image')}
              onChange={setImage}
            />
          </div>
        </div>

        {previews.image && (
          <div className="coordinate-picker-container" style={{ marginTop: '1.5rem' }}>
            {activeCoordinateTarget && (
              <div className="targeting-active-banner">
                <span>{t.targetingBanner}</span>
                <button type="button" onClick={() => setActiveCoordinateTarget(null)} style={{ background: 'transparent', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)' }}>{t.cancelTargetBtn}</button>
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
          {t.mapCoordinateBtn}
        </button>

        <button type="submit" className="btn-primary" disabled={status.isProcessing} style={{ background: state.editingId ? 'var(--accent-amber)' : 'var(--accent-cyan)', color: 'var(--bg-dark)', marginTop: '2rem' }}>
          {status.isProcessing ? t.processingBtn : t.commitSceneBtn}
        </button>
      </form>
    </div>
  );
}