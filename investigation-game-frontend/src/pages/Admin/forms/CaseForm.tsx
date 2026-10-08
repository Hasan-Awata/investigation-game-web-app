import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAdminCases } from '@/pages/Admin/hooks/useAdminData';
import { useAdminForm } from '@/pages/Admin/hooks/useAdminForm';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import EntityDashboard from '@/pages/Admin/components/EntityDashboard';
import MediaUploader from '@/pages/Admin/components/MediaUploader';
import { AdminRow, AdminInput, AdminTextarea, AdminCheckbox, AdminEntryToggle, AdminSelect } from '@/pages/Admin/components/AdminUI';
import { validateCaseForm, validateJsonPayload } from '@/pages/Admin/utils/validators';
import type { GameCase } from '@/types';
import adminForms from './Shared/AdminForms.module.css';
import adminDashboard from '../AdminDashboard.module.css';

// 1. Dynamically read all local images inside public/Maps/
const mapFiles = import.meta.glob('/public/Maps/*.{png,jpg,jpeg,webp}', { eager: true });
const AVAILABLE_MAPS = [
  { value: '', label: '-- Default Fallback Map --' },
  ...Object.keys(mapFiles).map(fullPath => {
    const fileName = fullPath.split('/').pop() || '';
    const cleanLabel = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, char => char.toUpperCase()); 
    return { value: `/Maps/${fileName}`, label: cleanLabel };
  })
];

const initialFormState = {
  title: '', story: '', map_url: '', min_player_XP: '0', XP_on_solve: '100', max_strikes: '5', rating_stars: '5.0',
  age_rating: 'Mature 17+', estimated_playtime: '60 Minutes', difficulty: 'Standard', tags: '',
  author_name: 'System', is_published: false, store_locally: false
};

const bulkTemplate = {
  case_details: {
    title: "",
    story: "",
    map_url: "",
    min_player_XP: 0,
    XP_on_solve: 500,
    max_strikes: 3,
    rating_stars: 5.0,
    age_rating: "Mature 17+",
    estimated_playtime: "120 Minutes",
    difficulty: "Hard",
    tags: ["Noir", "Cybercrime", "Murder"],
    author_name: "System Admin",
    is_published: false
  },
  evidences: [],
  characters: [], 
  investigation_requests: [],
  zones: []
};

export default function CaseForm() {
  const { data: cases = [], isLoading: isFetchingCases } = useAdminCases();
  const [image, setImage] = useState<File | null>(null);
  const [entryMode, setEntryMode] = useState<'form' | 'json'>('form');
  const [jsonInput, setJsonInput] = useState('');

  const initializedRef = useRef(false);

  const { adminT } = useAdminTranslation();
  const t = adminT.forms.caseForm;

  const {
    formData, updateField, editingId, clearForm, handleSubmit, handleEditInit, handleDelete, isProcessing, importEntity
  } = useAdminForm({
    entityType: 'case',
    initialState: initialFormState,
    validator: validateCaseForm
  });

  useEffect(() => {
    if (!initializedRef.current && entryMode === 'json' && !jsonInput && !editingId) {
      initializedRef.current = true;
      setJsonInput(JSON.stringify(bulkTemplate, null, 2));
    }
  }, [entryMode, jsonInput, editingId]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (entryMode === 'json') {
      const { valid, parsed, error } = validateJsonPayload(jsonInput, ['case_details', 'zones', 'evidences', 'characters', 'investigation_requests']);
      if (!valid) {
        toast.error(error!);
        return;
      }
      importEntity(parsed, {
        onSuccess: () => {
          setEntryMode('form');
          setJsonInput('');
          clearForm();
        }
      });
    } else {
      handleSubmit(e, { image });
    }
  };

  const onEdit = (c: GameCase) => {
    handleEditInit(c, (caseObj) => ({
      title: caseObj.title || '',
      story: caseObj.story || '',
      map_url: caseObj.map_url || '',
      min_player_XP: String(caseObj.min_player_XP),
      XP_on_solve: String(caseObj.XP_on_solve),
      max_strikes: String(caseObj.max_strikes),
      rating_stars: String(caseObj.rating_stars ?? '5.0'),
      age_rating: caseObj.age_rating || 'Mature 17+',
      estimated_playtime: caseObj.estimated_playtime || '60 Minutes',
      difficulty: caseObj.difficulty || 'Standard',
      tags: Array.isArray(caseObj.tags) ? caseObj.tags.join(', ') : (caseObj.tags || ''),
      author_name: caseObj.author_name || 'System',
      is_published: !!caseObj.is_published,
      store_locally: false,
    }));
    setImage(null);
    setEntryMode('form');
  };

  const onClear = () => { 
    clearForm(); 
    setImage(null); 
    setEntryMode('form');
    setJsonInput('');
  };

  const submitLabel = {
    creating: t.commitCase,
    editing: t.updateCase,
    processing: t.processingData
  };

  return (
    <EntityDashboard<GameCase>
      entityName={t.entityName}
      listTitle={t.manageTitle}
      items={cases}
      editingId={editingId}
      isProcessing={isProcessing}
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
      submitLabel={submitLabel}
    >
      <form onSubmit={onSubmit} className={adminDashboard['admin-form']}>
        {!editingId && <AdminEntryToggle mode={entryMode} setMode={setEntryMode} labelForm="Standard Entry" labelJson="JSON Bulk Case Injection" />}

        {entryMode === 'form' ? (
          <>
            <AdminCheckbox checked={formData.is_published} onChange={(e) => updateField('is_published', e.target.checked)} labelTitle={formData.is_published ? t.livePublished : t.draftClassified} description={formData.is_published ? t.liveDescription : t.draftDescription} className={formData.is_published ? adminForms['status-live'] : adminForms['status-draft']} />
            
            <AdminRow>
              <AdminInput label={t.titleLabel} required value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
              <AdminSelect 
                label="Regional Map Blueprint" 
                value={formData.map_url || ''} 
                onChange={(e) => updateField('map_url', e.target.value)} 
                options={AVAILABLE_MAPS} 
              />
            </AdminRow>
            
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

            <MediaUploader
              label={`${t.coverImageLabel} ${editingId ? t.coverImageEditSuffix : ''}`}
              hint={t.coverImageHint}
              accept="image/*"
              previewUrl={image ? URL.createObjectURL(image) : null}
              onChange={setImage}
            />

{image && (
              <AdminCheckbox
                checked={formData.store_locally}
                onChange={(e) => updateField('store_locally', e.target.checked)}
                labelTitle={t.storeLocallyLabel || 'Store Locally'}
                className={adminForms['amber']}
              />
            )}
          </>
        ) : (
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px', border: '1px dashed var(--accent-cyan)', marginBottom: '1.5rem' }}>
            <AdminTextarea 
              label="JSON Bulk Import Payload" 
              value={jsonInput} 
              onChange={e => setJsonInput(e.target.value)} 
              style={{ minHeight: '400px', fontFamily: 'var(--font-mono)' }} 
            />
          </div>
        )}
      </form>
    </EntityDashboard>
  );
}