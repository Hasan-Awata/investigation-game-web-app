import { useState } from 'react';
import { useAdminCases } from '@/pages/Admin/hooks/useAdminData';
import { useValidatedForm } from '@/pages/Admin/hooks/useValidatedForm';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import EntityDashboard from '@/pages/Admin/components/EntityDashboard';
import { AdminRow, AdminInput, AdminTextarea, AdminCheckbox, AdminFileInput } from '@/pages/Admin/components/AdminUI';
import { validateCaseForm } from '@/pages/Admin/utils/validators';
import type { GameCase } from '@/types';
import './Shared/AdminForms.css';

const initialFormState = {
  title: '', story: '', min_player_XP: '0', XP_on_solve: '100', max_strikes: '5', rating_stars: '5.0',
  age_rating: 'Mature 17+', estimated_playtime: '60 Minutes', difficulty: 'Standard', tags: '',
  author_name: 'System', is_published: false, store_locally: false
};

export default function CaseForm() {
  const { data: cases = [], isLoading: isFetchingCases } = useAdminCases();
  const [image, setImage] = useState<File | null>(null);
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.caseForm;

  const {
    formData, updateField, editingId, clearForm, handleValidatedSubmit, handleEditInit, handleDelete, registerFileRef, isProcessing
  } = useValidatedForm({
  entityType: 'case',
  initialState: initialFormState,
  validator: validateCaseForm
});

  const onEdit = (c: GameCase) => {
    handleEditInit(c, (caseObj) => ({
      ...initialFormState, ...caseObj,
      tags: Array.isArray(caseObj.tags) ? caseObj.tags.join(', ') : (caseObj.tags || ''),
      is_published: !!caseObj.is_published
    }));
    setImage(null);
  };

  const onClear = () => { clearForm(); setImage(null); };

  return (
    <EntityDashboard<GameCase>
      entityName={t.entityName}
      listTitle={t.manageTitle}
      items={cases}
      editingId={editingId}
      isProcessing={isProcessing}
      isFetching={isFetchingCases}
      emptyMessage={isFetchingCases ? t.loadingArchive : t.noCases} 
      keyExtractor={(c) => c.id}
      onClear={onClear}
      onEdit={onEdit}
      onDelete={(c) => handleDelete(c.id, t.deleteConfirm(c.title))}
      renderItemContent={(c) => (
        <>
          <span className={`entity-tag ${c.is_published ? 'published' : 'draft'}`}>
            [{c.is_published ? t.publishedTag : t.draftTag}]
          </span>
          <span className="entity-id">ID: {c.id}</span>
          <strong>{c.title}</strong>
        </>
      )}
    >
      <form onSubmit={(e) => handleValidatedSubmit(e, { image })} className="admin-form">
        <AdminCheckbox checked={formData.is_published} onChange={(e) => updateField('is_published', e.target.checked)} labelTitle={formData.is_published ? t.livePublished : t.draftClassified} description={formData.is_published ? t.liveDescription : t.draftDescription} className={formData.is_published ? 'status-live' : 'status-draft'} />
        <AdminInput label={t.titleLabel} required value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
        <AdminTextarea label={t.storyLabel} required value={formData.story} onChange={(e) => updateField('story', e.target.value)} />
        
        <AdminRow>
          <AdminInput label={t.minXpLabel} type="number" required value={formData.min_player_XP} onChange={(e) => updateField('min_player_XP', e.target.value)} />
          <AdminInput label={t.rewardXpLabel} type="number" required value={formData.XP_on_solve} onChange={(e) => updateField('XP_on_solve', e.target.value)} />
          <AdminInput label={t.strikesLabel} type="number" required value={formData.max_strikes} onChange={(e) => updateField('max_strikes', e.target.value)} />
        </AdminRow>

        <AdminRow>
          <AdminInput label={t.difficultyLabel} required value={formData.difficulty} onChange={(e) => updateField('difficulty', e.target.value)} />
          <AdminInput label={t.playtimeLabel} required value={formData.estimated_playtime} onChange={(e) => updateField('estimated_playtime', e.target.value)} />
          <AdminInput label={t.ageRatingLabel} required value={formData.age_rating} onChange={(e) => updateField('age_rating', e.target.value)} />
        </AdminRow>

        <AdminRow>
          <AdminInput label={t.userRatingLabel} type="number" step="0.1" required value={formData.rating_stars} onChange={(e) => updateField('rating_stars', e.target.value)} />
          <AdminInput label={t.authorLabel} required value={formData.author_name} onChange={(e) => updateField('author_name', e.target.value)} />
        </AdminRow>

        <AdminInput label={t.tagsLabel} placeholder={t.tagsPlaceholder} value={formData.tags} onChange={(e) => updateField('tags', e.target.value)} />
        <AdminFileInput label={`${t.coverImageLabel} ${editingId ? t.coverImageEditSuffix : ''}`} hint={t.coverImageHint} accept="image/*" ref={registerFileRef('image')} onChange={(e) => setImage(e.target.files?.[0] || null)} />
        
        <button type="submit" className={`btn-primary admin-submit-btn ${editingId ? 'editing' : 'creating'}`} disabled={isProcessing}>
          {isProcessing ? t.processingData : editingId ? t.updateCase : t.commitCase}
        </button>
      </form>
    </EntityDashboard>
  );
}