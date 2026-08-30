import { useState, useRef } from 'react';
import { useAdminCases } from '@/hooks/useAdminData';
import { useAdminMutations } from '@/hooks/useAdminMutations';
import EntityList from './Shared/EntityList';
import AdminFormHeader from './Shared/AdminFormHeader';
import StatusMessage from './Shared/StatusMessage';
import { validateImageSize } from '@/utils/fileValidation';
import { objectToFormData } from '@/utils/formUtils';
import type { GameCase } from '@/types';
import { AdminRow, AdminInput, AdminTextarea, AdminCheckbox, AdminFileInput } from '@/components/AdminUI';

const initialFormState = {
  title: '', story: '', min_player_XP: '0', XP_on_solve: '100',
  max_strikes: '5', rating_stars: '5.0', age_rating: 'Mature 17+',
  estimated_playtime: '60 Minutes', difficulty: 'Standard', tags: '',
  author_name: 'System', is_published: false, store_locally: false
};

export default function CaseForm() {
  const [editingCaseId, setEditingCaseId] = useState<number | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [image, setImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: cases = [], isLoading: isFetchingCases } = useAdminCases();
  const { createEntity, updateEntity, deleteEntity, isProcessing, feedback, clearFeedback } = useAdminMutations('case');

  const updateField = (field: keyof typeof initialFormState, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  const clearForm = () => {
    setEditingCaseId(null); setFormData(initialFormState); setImage(null); clearFeedback();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateImageSize(file)) setImage(file);
    else { setImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    
    // Abstracted: The 15 lines of payload.append() are gone
    const payload = objectToFormData(formData);
    if (image) payload.append('image', image);

    if (editingCaseId) updateEntity({ id: editingCaseId, formData: payload }, { onSuccess: clearForm });
    else createEntity(payload, { onSuccess: clearForm });
  };

  const handleEditInit = (caseObj: GameCase) => {
    clearFeedback();
    setEditingCaseId(caseObj.id);
    
    // Abstracted: The 15 lines of manual state property mapping are gone
    setFormData({
      title: caseObj.title,
      story: caseObj.story,
      min_player_XP: caseObj.min_player_XP?.toString() || '0',
      XP_on_solve: caseObj.XP_on_solve?.toString() || '100',
      max_strikes: caseObj.max_strikes?.toString() || '5',
      rating_stars: caseObj.rating_stars?.toString() || '5.0',
      age_rating: caseObj.age_rating || 'Mature 17+',
      estimated_playtime: caseObj.estimated_playtime || '60 Minutes',
      difficulty: caseObj.difficulty || 'Standard',
      tags: Array.isArray(caseObj.tags) ? caseObj.tags.join(', ') : (caseObj.tags || ''),
      author_name: caseObj.author_name || 'System',
      is_published: !!caseObj.is_published,
      store_locally: false
    });

    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (c: GameCase) => {
    if (window.confirm(`Delete "${c.title}"? All nested data will be wiped.`)) {
      if (editingCaseId === c.id) clearForm();
      deleteEntity(c.id);
    }
  };

  return (
    <div className="admin-form-wrapper glass-panel">
      <div>
        <AdminFormHeader editingId={editingCaseId} entityName="Case" onCancel={clearForm} />
        <StatusMessage feedback={feedback} />

        <form onSubmit={handleSubmit} className="admin-form">
          <AdminCheckbox
            checked={formData.is_published} onChange={(e) => updateField('is_published', e.target.checked)}
            labelTitle={formData.is_published ? 'LIVE / PUBLISHED' : 'DRAFT / CLASSIFIED'}
            description={formData.is_published ? 'Visible to all agents.' : 'Hidden from public.'}
            accentColor={formData.is_published ? 'var(--accent-cyan)' : 'var(--accent-crimson)'}
            bgColor={formData.is_published ? 'rgba(0, 229, 255, 0.1)' : 'rgba(163, 50, 50, 0.1)'}
          />

          <AdminInput label="Case Title" type="text" required value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
          <AdminTextarea label="Official Briefing (Story)" required value={formData.story} onChange={(e) => updateField('story', e.target.value)} />

          <AdminRow>
            <AdminInput label="Minimum XP Required" type="number" min="0" required value={formData.min_player_XP} onChange={(e) => updateField('min_player_XP', e.target.value)} />
            <AdminInput label="XP Reward on Solve" type="number" min="0" required value={formData.XP_on_solve} onChange={(e) => updateField('XP_on_solve', e.target.value)} />
            <AdminInput label="Allowed Strikes" type="number" min="1" required value={formData.max_strikes} onChange={(e) => updateField('max_strikes', e.target.value)} />
          </AdminRow>

          <AdminRow>
            <AdminInput label="Difficulty" type="text" required value={formData.difficulty} onChange={(e) => updateField('difficulty', e.target.value)} />
            <AdminInput label="Est. Playtime" type="text" required value={formData.estimated_playtime} onChange={(e) => updateField('estimated_playtime', e.target.value)} />
            <AdminInput label="Content Rating" type="text" required value={formData.age_rating} onChange={(e) => updateField('age_rating', e.target.value)} />
          </AdminRow>

          <AdminRow>
            <AdminInput label="User Rating (0.0 - 5.0)" type="number" step="0.1" max="5" min="0" required value={formData.rating_stars} onChange={(e) => updateField('rating_stars', e.target.value)} />
            <AdminInput label="Author / Creator" type="text" required value={formData.author_name} onChange={(e) => updateField('author_name', e.target.value)} />
          </AdminRow>

          <AdminInput label="Genre Tags (Comma Separated)" type="text" placeholder="Tactical, Puzzle" value={formData.tags} onChange={(e) => updateField('tags', e.target.value)} />

          <AdminFileInput
            label={`Cover Image ${editingCaseId ? '(Leave blank to keep existing)' : ''}`}
            hint="Optimal: 1:1 or 16:9 ratio. Min 800x800px. WEBP or JPG. Max 4MB."
            accept="image/*" ref={fileInputRef} onChange={handleImageChange}
          />

          <AdminCheckbox
            checked={formData.store_locally} onChange={(e) => updateField('store_locally', e.target.checked)}
            labelTitle="Store Locally on Server" description="Save assets directly to public server folders instead of Cloudinary."
            accentColor="var(--accent-amber)"
          />

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingCaseId ? 'var(--accent-amber)' : 'var(--accent-crimson)', marginTop: '1rem', color: 'var(--bg-dark)' }}>
            {isProcessing ? 'Processing Data...' : editingCaseId ? 'Update Case' : 'Commit Case'}
          </button>
        </form>
      </div>

      <EntityList<GameCase>
        title="Manage Existing Cases" items={cases}
        emptyMessage={isFetchingCases ? "Loading archive..." : "No cases in database."}
        keyExtractor={(c) => c.id} isProcessing={isProcessing} onEdit={handleEditInit} onDelete={handleDelete}
        renderItemContent={(c) => (
          <>
            <span style={{ fontFamily: 'var(--font-mono)', color: c.is_published ? 'var(--accent-success)' : 'var(--accent-amber)', marginRight: '1rem', fontSize: '0.85rem' }}>
              [{c.is_published ? 'PUBLISHED' : 'DRAFT'}]
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginRight: '1rem' }}>ID: {c.id}</span>
            <strong>{c.title}</strong>
          </>
        )}
      />
    </div>
  );
}