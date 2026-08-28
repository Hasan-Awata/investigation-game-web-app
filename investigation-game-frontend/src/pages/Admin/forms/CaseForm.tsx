import { useState, useRef } from 'react';
import { useAdminCases } from '@/hooks/useAdminData';
import { useAdminMutations } from '@/hooks/useAdminMutations';
import EntityList from './Shared/EntityList';
import type { GameCase } from '@/types';

export default function CaseForm() {
  const [editingCaseId, setEditingCaseId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [minPlayerXP, setMinPlayerXP] = useState('0');
  const [xpOnSolve, setXpOnSolve] = useState('100');
  const [maxStrikes, setMaxStrikes] = useState('5'); 
  const [image, setImage] = useState<File | null>(null);
  const [ratingStars, setRatingStars] = useState('5.0');
  const [ageRating, setAgeRating] = useState('Mature 17+');
  const [estimatedPlaytime, setEstimatedPlaytime] = useState('60 Minutes');
  const [difficulty, setDifficulty] = useState('Standard');
  const [tags, setTags] = useState('');
  const [authorName, setAuthorName] = useState('System');
  const [isPublished, setIsPublished] = useState(false);
  const [storeLocally, setStoreLocally] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: cases = [], isLoading: isFetchingCases } = useAdminCases();

  const { 
    createEntity, updateEntity, deleteEntity, isProcessing, 
    feedback, clearFeedback 
  } = useAdminMutations('case');

  const clearForm = () => {
    setEditingCaseId(null);
    setTitle(''); setStory(''); setMinPlayerXP('0'); setXpOnSolve('100');
    setMaxStrikes('5'); setRatingStars('5.0'); setAgeRating('Mature 17+');
    setEstimatedPlaytime('60 Minutes'); setDifficulty('Standard'); setTags('');
    setAuthorName('System'); setIsPublished(false); setStoreLocally(false);
    setImage(null); clearFeedback();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    const formData = new FormData();
    formData.append('title', title); formData.append('story', story);
    formData.append('min_player_XP', minPlayerXP); formData.append('XP_on_solve', xpOnSolve);
    formData.append('max_strikes', maxStrikes); formData.append('rating_stars', ratingStars);
    formData.append('age_rating', ageRating); formData.append('estimated_playtime', estimatedPlaytime);
    formData.append('difficulty', difficulty); formData.append('tags', tags);
    formData.append('author_name', authorName); formData.append('is_published', isPublished ? '1' : '0'); 
    formData.append('store_locally', storeLocally ? '1' : '0');
    if (image) formData.append('image', image);

    if (editingCaseId) {
      updateEntity({ id: editingCaseId, formData }, { onSuccess: clearForm });
    } else {
      createEntity(formData, { onSuccess: clearForm });
    }
  };

  const handleEditInit = (caseObj: GameCase) => {
    clearFeedback();
    setEditingCaseId(caseObj.id);
    setTitle(caseObj.title); setStory(caseObj.story);
    setMinPlayerXP(caseObj.min_player_XP?.toString() || '0');
    setXpOnSolve(caseObj.XP_on_solve?.toString() || '100');
    setMaxStrikes(caseObj.max_strikes?.toString() || '5');
    setRatingStars(caseObj.rating_stars?.toString() || '5.0');
    setAgeRating(caseObj.age_rating || 'Mature 17+');
    setEstimatedPlaytime(caseObj.estimated_playtime || '60 Minutes');
    setDifficulty(caseObj.difficulty || 'Standard');
    setTags(Array.isArray(caseObj.tags) ? caseObj.tags.join(', ') : (caseObj.tags || ''));
    setAuthorName(caseObj.author_name || 'System');
    setIsPublished(!!caseObj.is_published); 
    
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (c: GameCase) => {
    if (window.confirm(`Are you absolutely sure you want to delete "${c.title}"? All nested levels, evidence, and media will be wiped permanently.`)) {
      if (editingCaseId === c.id) clearForm();
      deleteEntity(c.id);
    }
  };

  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: editingCaseId ? 'var(--accent-amber)' : 'var(--accent-crimson)', margin: 0 }}>
            {editingCaseId ? `// Editing Case ID: ${editingCaseId}` : '// Initialize New Case'}
          </h3>
          {editingCaseId && (
            <button type="button" className="btn-secondary" onClick={clearForm} style={{ padding: '0.5rem 1rem', width: 'auto', flex: 'none' }}>Cancel Edit</button>
          )}
        </div>
        
        {feedback && <div className={`status-message ${feedback.type}`}>{feedback.message}</div>}

        <form onSubmit={handleSubmit} className="admin-form">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: isPublished ? 'rgba(0, 229, 255, 0.1)' : 'rgba(163, 50, 50, 0.1)', border: `1px solid ${isPublished ? 'rgba(0, 229, 255, 0.3)' : 'rgba(163, 50, 50, 0.3)'}`, padding: '1rem', borderRadius: '8px', marginBottom: '1rem', transition: 'all 0.3s ease' }}>
            <input type="checkbox" id="published-toggle" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} style={{ transform: 'scale(1.5)', accentColor: isPublished ? 'var(--accent-cyan)' : 'var(--accent-crimson)' }} />
            <label htmlFor="published-toggle" style={{ fontFamily: 'var(--font-mono)', color: isPublished ? 'var(--accent-cyan)' : 'var(--accent-crimson)', cursor: 'pointer' }}>
              <strong>{isPublished ? 'LIVE / PUBLISHED' : 'DRAFT / CLASSIFIED'} :</strong> {isPublished ? 'This case is visible to all agents on the main board.' : 'This case is hidden from the public. Only visible in Admin Oversight.'}
            </label>
          </div>

          <div className="form-group"><label>Case Title</label><input type="text" className="admin-input" required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="form-group"><label>Official Briefing (Story)</label><textarea className="admin-textarea" required value={story} onChange={(e) => setStory(e.target.value)} /></div>

          <div className="admin-form-row">
            <div className="form-group" style={{ flex: 1 }}><label>Minimum XP Required</label><input type="number" className="admin-input" min="0" required value={minPlayerXP} onChange={(e) => setMinPlayerXP(e.target.value)} /></div>
            <div className="form-group" style={{ flex: 1 }}><label>XP Reward on Solve</label><input type="number" className="admin-input" min="0" required value={xpOnSolve} onChange={(e) => setXpOnSolve(e.target.value)} /></div>
            <div className="form-group" style={{ flex: 1 }}><label>Allowed Strikes (Difficulty)</label><input type="number" className="admin-input" min="1" required value={maxStrikes} onChange={(e) => setMaxStrikes(e.target.value)} /></div>
          </div>
          
          <div className="admin-form-row">
            <div className="form-group" style={{ flex: 1 }}><label>Difficulty</label><input type="text" className="admin-input" required value={difficulty} onChange={(e) => setDifficulty(e.target.value)} /></div>
            <div className="form-group" style={{ flex: 1 }}><label>Est. Playtime</label><input type="text" className="admin-input" required value={estimatedPlaytime} onChange={(e) => setEstimatedPlaytime(e.target.value)} /></div>
            <div className="form-group" style={{ flex: 1 }}><label>Content Rating</label><input type="text" className="admin-input" required value={ageRating} onChange={(e) => setAgeRating(e.target.value)} /></div>
          </div>

          <div className="admin-form-row">
            <div className="form-group" style={{ flex: 1 }}><label>User Rating (0.0 to 5.0)</label><input type="number" step="0.1" max="5" min="0" className="admin-input" required value={ratingStars} onChange={(e) => setRatingStars(e.target.value)} /></div>
            <div className="form-group" style={{ flex: 1 }}><label>Author / Creator</label><input type="text" className="admin-input" required value={authorName} onChange={(e) => setAuthorName(e.target.value)} /></div>
          </div>

          <div className="form-group"><label>Genre Tags (Comma Separated)</label><input type="text" className="admin-input" placeholder="Tactical, Puzzle, Espionage" value={tags} onChange={(e) => setTags(e.target.value)} /></div>
          
          <div className="form-group">
            <label>Cover Image {editingCaseId && '(Leave blank to keep existing image)'}</label>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}><strong>Optimal:</strong> 1:1 (Square) or 16:9 ratio. Min 800x800px. WEBP or JPG format. Max 4MB.</p>
            <input type="file" className="admin-file-input" accept="image/*" ref={fileInputRef} onChange={(e) => setImage(e.target.files?.[0] || null)} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <input type="checkbox" id="store-locally-toggle" checked={storeLocally} onChange={(e) => setStoreLocally(e.target.checked)} style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-amber)' }} />
            <label htmlFor="store-locally-toggle" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-amber)', cursor: 'pointer' }}><strong>Store Locally on Server:</strong> Save assets directly to public server folders instead of Cloudinary.</label>
          </div>

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingCaseId ? 'var(--accent-amber)' : 'var(--accent-crimson)', marginTop: '1rem', color: 'var(--bg-dark)' }}>
            {isProcessing ? 'Processing Data...' : editingCaseId ? 'Update Existing Case' : 'Commit Case to Database'}
          </button>
        </form>
      </div>

      <EntityList<GameCase>
        title="Manage Existing Cases"
        items={cases}
        emptyMessage={isFetchingCases ? "Loading archive..." : "No cases in database."}
        keyExtractor={(c) => c.id}
        isProcessing={isProcessing}
        onEdit={handleEditInit}
        onDelete={handleDelete}
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