import { useState } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import type { Evidence, Level, Phase, Suspect, Victim } from '@/types';

export interface DraftChoice {
  id?: number | string;
  text: string;
  outcomes?: {
    unlock_evidence?: number[];
    unlock_levels?: number[];
    unlock_suspects?: number[];
    unlock_victims?: number[];
    next_question_id?: number | null;
    gives_strike?: boolean;
    feedback?: string;
  };
  requirements?: {
    required_evidence?: number[];
    required_choices?: number[];
  };
}

export interface LevelWithPhase extends Level {
  phase?: Phase;
  phase_title?: string;
}

export interface FlattenedChoice extends DraftChoice {
  question_id?: number;
  question_text?: string;
}

interface ChoiceEditorCardProps {
  index: number;
  choice: DraftChoice;
  updateChoice: (updated: DraftChoice) => void;
  removeChoice: () => void;
  isLocationMode?: boolean;
  isTargeting?: boolean;
  onToggleTarget?: () => void;
}

export default function ChoiceEditorCard({ 
  index, 
  choice, 
  updateChoice, 
  removeChoice, 
  isLocationMode = false,
  isTargeting = false,
  onToggleTarget
}: ChoiceEditorCardProps) {

  const [isExpanded, setIsExpanded] = useState<boolean>(
    typeof choice.id === 'string' || choice.id === undefined
  );

  const { selectedCase } = useAdminContext();

  // Protect against rendering if context drops
  if (!selectedCase) return null;

  const availableEvidence = selectedCase.evidences || [];
  const availableLevels = selectedCase.phases?.flatMap(p => p.levels || []) || [];
  const availableSuspects = selectedCase.suspects || [];
  const availableVictims = selectedCase.victims || [];

  const updateOutcomes = <K extends keyof NonNullable<DraftChoice['outcomes']>>(
    key: K,
    value: NonNullable<DraftChoice['outcomes']>[K]
  ) => {
    updateChoice({
      ...choice,
      outcomes: {
        ...(choice.outcomes || {}),
        [key]: value
      }
    });
  };

  const updateRequirements = <K extends keyof NonNullable<DraftChoice['requirements']>>(
    key: K,
    value: NonNullable<DraftChoice['requirements']>[K]
  ) => {
    updateChoice({
      ...choice,
      requirements: {
        ...(choice.requirements || {}),
        [key]: value
      }
    });
  };

  const unlockedEv = choice.outcomes?.unlock_evidence?.map(String) || [];
  const unlockedLv = choice.outcomes?.unlock_levels?.map(String) || [];
  const unlockedSu = choice.outcomes?.unlock_suspects?.map(String) || [];
  const unlockedVi = choice.outcomes?.unlock_victims?.map(String) || [];
  const reqEv = choice.requirements?.required_evidence?.map(String) || [];

  const hasCoords = choice.text.includes('|') && !choice.text.startsWith('|');
  const coordPreview = hasCoords ? choice.text.split('|')[0].trim() : null;

  return (
    <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1.25rem 1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.2s ease' }}>
      
      {/* CLEAN HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)} 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
          <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 'bold', fontSize: '0.9rem' }}>
            Choice #{index + 1}
          </span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
            {choice.text ? `"${choice.text}"` : '(Blank Choice Text)'}
          </span>
          
          {coordPreview && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', padding: '0.1rem 0.4rem', background: 'rgba(0, 229, 255, 0.1)', color: 'var(--accent-cyan)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '4px' }}>
              📍 {coordPreview}%
            </span>
          )}

          {choice.outcomes?.gives_strike && (
            <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'rgba(255, 75, 75, 0.2)', color: 'var(--accent-crimson)', border: '1px solid var(--accent-crimson)', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
              STRIKE PENALTY
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          
          {isLocationMode && onToggleTarget && (
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onToggleTarget}
              style={{ 
                padding: '0.25rem 0.75rem', 
                fontSize: '0.75rem',
                width: 'auto',
                background: isTargeting ? 'var(--accent-cyan)' : 'rgba(0,0,0,0.8)',
                borderColor: isTargeting ? 'var(--accent-cyan)' : 'var(--accent-amber)', 
                color: isTargeting ? 'var(--bg-dark)' : 'var(--accent-amber)',
                fontWeight: 'bold'
              }}
            >
              {isTargeting ? '🎯 TARGETING...' : '🎯 MAP'}
            </button>
          )}

          <button 
            type="button" 
            onClick={() => setIsExpanded(!isExpanded)} 
            className="btn-secondary" 
            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', width: 'auto', background: 'rgba(255,255,255,0.05)' }}
          >
            {isExpanded ? '▲ Collapse' : '▼ Expand'}
          </button>
          
          <button 
            type="button" 
            onClick={removeChoice} 
            style={{ background: 'transparent', color: 'var(--accent-crimson)', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0 0.25rem' }}
            title="Delete Choice"
          >
            ✕
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE BODY CONTENT */}
      {isExpanded && (
        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="form-group">
            <label>Choice Text</label>
            <input 
              type="text" className="admin-input" required 
              value={choice.text} 
              onChange={(e) => updateChoice({ ...choice, text: e.target.value })} 
              placeholder="e.g., The killer entered through the vents."
            />
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
            <h6 style={{ color: 'var(--text-secondary)', margin: '0 0 1rem 0', fontFamily: 'var(--font-mono)' }}>[ NARRATIVE OUTCOMES & UNLOCKS ]</h6>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <input 
                type="checkbox" 
                checked={!!choice.outcomes?.gives_strike} 
                onChange={(e) => updateOutcomes('gives_strike', e.target.checked)} 
                style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-crimson)' }} 
              />
              <label style={{ color: 'var(--accent-crimson)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', cursor: 'pointer' }}>
                <strong>PENALTY STRIKE:</strong> Selecting this choice logs a strike against the team.
              </label>
            </div>

            <div className="form-group">
              <label>Feedback Message (Shown when selected / Failed hint)</label>
              <textarea 
                className="admin-textarea" 
                value={choice.outcomes?.feedback || ''} 
                onChange={(e) => updateOutcomes('feedback', e.target.value)}
                style={{ minHeight: '60px' }}
                placeholder="e.g., You wasted time tracking a dead end."
              />
            </div>

            <div className="admin-form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Unlocks Evidence</label>
                <select multiple className="admin-input" style={{ height: '100px' }} value={unlockedEv} onChange={(e) => updateOutcomes('unlock_evidence', Array.from(e.target.selectedOptions, opt => Number(opt.value)))}>
                  {availableEvidence.map((ev: Evidence) => (
                    <option key={ev.id} value={ev.id.toString()}>EX-{ev.id.toString().padStart(3, '0')}: {ev.title}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Unlocks Phase/Level</label>
                <select multiple className="admin-input" style={{ height: '100px' }} value={unlockedLv} onChange={(e) => updateOutcomes('unlock_levels', Array.from(e.target.selectedOptions, opt => Number(opt.value)))}>
                  {availableLevels.map((lv: Level) => (
                    <option key={lv.id} value={lv.id.toString()}>Level {lv.order_index}: {lv.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="admin-form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Unlocks Suspects</label>
                <select multiple className="admin-input" style={{ height: '100px' }} value={unlockedSu} onChange={(e) => updateOutcomes('unlock_suspects', Array.from(e.target.selectedOptions, opt => Number(opt.value)))}>
                  {availableSuspects.map((su: Suspect) => (
                    <option key={su.id} value={su.id.toString()}>{su.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Unlocks Victims</label>
                <select multiple className="admin-input" style={{ height: '100px' }} value={unlockedVi} onChange={(e) => updateOutcomes('unlock_victims', Array.from(e.target.selectedOptions, opt => Number(opt.value)))}>
                  {availableVictims.map((vi: Victim) => (
                    <option key={vi.id} value={vi.id.toString()}>{vi.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px dashed var(--accent-amber)' }}>
            <h6 style={{ color: 'var(--accent-amber)', margin: '0 0 1rem 0', fontFamily: 'var(--font-mono)' }}>[ GATEKEEPER REQUIREMENTS ]</h6>
            <div className="form-group">
              <label>Required Evidence to Select</label>
              <select multiple className="admin-input" style={{ height: '100px' }} value={reqEv} onChange={(e) => updateRequirements('required_evidence', Array.from(e.target.selectedOptions, opt => Number(opt.value)))}>
                {availableEvidence.map((ev: Evidence) => (
                  <option key={ev.id} value={ev.id.toString()}>EX-{ev.id.toString().padStart(3, '0')}: {ev.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}