import { useState } from 'react';
import { useAdminCases } from '@/hooks/useAdminData';
import { useAdminForm } from '@/hooks/useAdminForm';
import AdminFormLayout from '@/components/AdminFormLayout';
import EntityList from './Shared/EntityList';
import { AdminRow, AdminInput, AdminTextarea, AdminCheckbox, AdminFileInput } from '@/components/AdminUI';
import type { GameCase } from '@/types';

const initialFormState = {
  title: '', story: '', min_player_XP: '0', XP_on_solve: '100', max_strikes: '5', rating_stars: '5.0',
  age_rating: 'Mature 17+', estimated_playtime: '60 Minutes', difficulty: 'Standard', tags: '',
  author_name: 'System', is_published: false, store_locally: false
};

export default function CaseForm() {
  const { data: cases = [], isLoading: isFetchingCases } = useAdminCases();
  const [image, setImage] = useState<File | null>(null);

  const {
    formData, updateField, editingId, clearForm, handleSubmit, handleEditInit, handleDelete, registerFileRef, isProcessing, feedback
  } = useAdminForm({ entityType: 'case', initialState: initialFormState });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => handleSubmit(e, { image });

  const onEdit = (c: GameCase) => {
    handleEditInit(c, (caseObj) => ({
      ...initialFormState, ...caseObj,
      tags: Array.isArray(caseObj.tags) ? caseObj.tags.join(', ') : (caseObj.tags || ''),
      is_published: !!caseObj.is_published
    }));
    setImage(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <AdminFormLayout editingId={editingId} entityName="Case" feedback={feedback} onCancel={clearForm}>
        <form onSubmit={onSubmit} className="admin-form">
          <AdminCheckbox checked={formData.is_published} onChange={(e) => updateField('is_published', e.target.checked)} labelTitle={formData.is_published ? 'LIVE / PUBLISHED' : 'DRAFT / CLASSIFIED'} description={formData.is_published ? 'Visible to all agents.' : 'Hidden from public.'} accentColor={formData.is_published ? 'var(--accent-cyan)' : 'var(--accent-crimson)'} bgColor={formData.is_published ? 'rgba(0, 229, 255, 0.1)' : 'rgba(163, 50, 50, 0.1)'} />
          
          <AdminInput label="Case Title" type="text" required value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
          <AdminTextarea label="Official Briefing (Story)" required value={formData.story} onChange={(e) => updateField('story', e.target.value)} />

          <AdminRow>
            <AdminInput label="Min XP" type="number" required value={formData.min_player_XP} onChange={(e) => updateField('min_player_XP', e.target.value)} />
            <AdminInput label="Reward XP" type="number" required value={formData.XP_on_solve} onChange={(e) => updateField('XP_on_solve', e.target.value)} />
            <AdminInput label="Strikes" type="number" required value={formData.max_strikes} onChange={(e) => updateField('max_strikes', e.target.value)} />
          </AdminRow>

          <AdminRow>
            <AdminInput label="Difficulty" required value={formData.difficulty} onChange={(e) => updateField('difficulty', e.target.value)} />
            <AdminInput label="Playtime" required value={formData.estimated_playtime} onChange={(e) => updateField('estimated_playtime', e.target.value)} />
            <AdminInput label="Rating" required value={formData.age_rating} onChange={(e) => updateField('age_rating', e.target.value)} />
          </AdminRow>

          <AdminRow>
            <AdminInput label="User Rating (0-5)" type="number" step="0.1" required value={formData.rating_stars} onChange={(e) => updateField('rating_stars', e.target.value)} />
            <AdminInput label="Author" required value={formData.author_name} onChange={(e) => updateField('author_name', e.target.value)} />
          </AdminRow>

          <AdminInput label="Genre Tags (Comma Separated)" placeholder="Tactical, Puzzle" value={formData.tags} onChange={(e) => updateField('tags', e.target.value)} />
          
          <AdminFileInput label={`Cover Image ${editingId ? '(Leave blank to keep existing)' : ''}`} hint="Optimal: 1:1 or 16:9 ratio." accept="image/*" ref={registerFileRef('image')} onChange={(e) => setImage(e.target.files?.[0] || null)} />
          <AdminCheckbox checked={formData.store_locally} onChange={(e) => updateField('store_locally', e.target.checked)} labelTitle="Store Locally on Server" accentColor="var(--accent-amber)" />

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', color: 'var(--bg-dark)', marginTop: '1rem' }}>
            {isProcessing ? 'Processing Data...' : editingId ? 'Update Case' : 'Commit Case'}
          </button>
        </form>
      </AdminFormLayout>

      <EntityList<GameCase>
        title="Manage Existing Cases" items={cases} emptyMessage={isFetchingCases ? "Loading archive..." : "No cases in database."}
        keyExtractor={(c) => c.id} isProcessing={isProcessing} onEdit={onEdit} onDelete={(c) => handleDelete(c.id, `Delete "${c.title}"?`)}
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