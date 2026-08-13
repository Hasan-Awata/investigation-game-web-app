import React, { useState } from 'react';
import type { Evidence, Suspect, Victim, Level } from '@/types';
import type { ChoiceState, ChoiceOutcomes, ChoiceRequirements } from './questionUtils';

// Utility types for the flattened relational arrays passed from the parent
export interface LevelWithPhase extends Level {
  phase_title: string;
}

export interface FlattenedChoice {
  id: number;
  text: string;
  question_text: string;
  level_title: string;
}

interface ChoiceEditorCardProps {
  choice: ChoiceState;
  onUpdate: (updatedChoice: ChoiceState) => void;
  onRemove: () => void;
  availableEvidences: Evidence[];
  allCaseLevels: LevelWithPhase[];
  availableSuspects: Suspect[];
  availableVictims: Victim[];
  allCaseChoices: FlattenedChoice[];
  isLocationPhase?: boolean;
  isActiveTarget?: boolean;
  onToggleTarget?: (e: React.MouseEvent) => void;
  placeholderText?: string;
}

export default function ChoiceEditorCard({ 
  choice, onUpdate, onRemove, 
  availableEvidences, allCaseLevels, availableSuspects, availableVictims, allCaseChoices,
  isLocationPhase = false, isActiveTarget = false, onToggleTarget,
  placeholderText = "Choice text..."
}: ChoiceEditorCardProps) {
  const [isExpanded, setIsExpanded] = useState(!choice.text);

  const updateField = (field: 'text', val: string) => onUpdate({ ...choice, [field]: val });
  const updateOutcome = (field: keyof ChoiceOutcomes, val: any) => onUpdate({ ...choice, outcomes: { ...choice.outcomes, [field]: val } });
  const updateRequirement = (field: keyof ChoiceRequirements, val: any) => onUpdate({ ...choice, requirements: { ...choice.requirements, [field]: val } });

  const handleMultiSelect = (e: React.ChangeEvent<HTMLSelectElement>, field: string, isReq = false) => {
    const values = Array.from(e.target.selectedOptions, opt => opt.value);
    if (isReq) updateRequirement(field as keyof ChoiceRequirements, values);
    else updateOutcome(field as keyof ChoiceOutcomes, values);
  };

  return (
    <div className={`qf-choice-row ${isActiveTarget ? 'picking-target' : ''}`}>
      <div className="qf-choice-top" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button type="button" onClick={() => setIsExpanded(!isExpanded)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem', padding: '0.5rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</button>
        <input type="text" className="admin-input qf-choice-text-input" required placeholder={placeholderText} value={choice.text} onChange={(e) => updateField('text', e.target.value)} />
        
        {isLocationPhase && onToggleTarget && (
          <button type="button" className={`pick-point-btn ${isActiveTarget ? 'active' : ''}`} onClick={onToggleTarget} title="Click to arm crosshair targeter">🎯</button>
        )}
        
        <button type="button" className="qf-delete-btn" onClick={onRemove}>×</button>
      </div>
      
      {isExpanded && (
        <div className={`qf-choice-bottom ${!isLocationPhase ? 'indented' : ''}`} style={{ animation: 'fadeIn 0.2s ease-out' }}>
          
          <div className="qf-outcomes-builder" style={{ borderColor: 'var(--text-secondary)', marginBottom: '1rem' }}>
            <label className="qf-outcome-label" style={{ color: 'var(--text-secondary)' }}>Lock Requirements</label>
            <div className="qf-outcomes-grid">
              <div className="qf-outcome-group">
                <label className="qf-outcome-label">Requires Evidence</label>
                <select multiple className="admin-input qf-multi-select" value={choice.requirements.required_evidence} onChange={(e) => handleMultiSelect(e, 'required_evidence', true)}>
                  {availableEvidences.map((ev) => <option key={ev.id} value={ev.id}>EX-{ev.id} {ev.title}</option>)}
                </select>
              </div>
              <div className="qf-outcome-group">
                <label className="qf-outcome-label">Requires Past Choice</label>
                <select multiple className="admin-input qf-multi-select" value={choice.requirements.required_choices} onChange={(e) => handleMultiSelect(e, 'required_choices', true)}>
                  {allCaseChoices.map((c) => (
                    <option key={c.id} value={c.id}>[{c.level_title}] {c.question_text.substring(0, 25)}... ➔ {c.text.substring(0, 15)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="qf-outcomes-builder">
            <div className="qf-outcome-group">
              <label className="qf-outcome-label">Feedback Message</label>
              <input type="text" className="admin-input" placeholder="e.g., I found something useful here." value={choice.outcomes.feedback} onChange={(e) => updateOutcome('feedback', e.target.value)} />
            </div>

            <div className="qf-outcome-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem', background: choice.outcomes.gives_strike ? 'rgba(163, 50, 50, 0.15)' : 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: '4px', border: `1px solid ${choice.outcomes.gives_strike ? 'rgba(163, 50, 50, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`, marginTop: '0.5rem', transition: 'all 0.2s ease' }}>
              <input type="checkbox" checked={choice.outcomes.gives_strike} onChange={(e) => updateOutcome('gives_strike', e.target.checked)} style={{ transform: 'scale(1.2)', accentColor: 'var(--accent-crimson)', cursor: 'pointer' }} />
              <label className="qf-outcome-label" style={{ color: choice.outcomes.gives_strike ? 'var(--accent-crimson)' : 'var(--text-secondary)', margin: 0, cursor: 'pointer' }} onClick={() => updateOutcome('gives_strike', !choice.outcomes.gives_strike)}>
                Triggers Department Strike (Penalty)
              </label>
            </div>

            <div className="qf-outcomes-grid" style={{ marginTop: '0.5rem' }}>
              <div className="qf-outcome-group">
                <label className="qf-outcome-label">Next Node ID</label>
                <input type="number" className="admin-input" placeholder="Question ID" value={choice.outcomes.next_question_id} onChange={(e) => updateOutcome('next_question_id', e.target.value)} />
              </div>
              <div className="qf-outcome-group">
                <label className="qf-outcome-label">Unlock Evidence</label>
                <select multiple className="admin-input qf-multi-select" value={choice.outcomes.unlock_evidence} onChange={(e) => handleMultiSelect(e, 'unlock_evidence')}>
                  {availableEvidences.map((ev) => <option key={ev.id} value={ev.id}>EX-{ev.id} {ev.title}</option>)}
                </select>
              </div>
              <div className="qf-outcome-group">
                <label className="qf-outcome-label">Unlock Phase/Level</label>
                <select multiple className="admin-input qf-multi-select" value={choice.outcomes.unlock_levels} onChange={(e) => handleMultiSelect(e, 'unlock_levels')}>
                  {allCaseLevels.map((l) => <option key={l.id} value={l.id}>{l.phase_title}: {l.title}</option>)}
                </select>
              </div>
              <div className="qf-outcome-group">
                <label className="qf-outcome-label">Unlock Suspect</label>
                <select multiple className="admin-input qf-multi-select" value={choice.outcomes.unlock_suspects} onChange={(e) => handleMultiSelect(e, 'unlock_suspects')}>
                  {availableSuspects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="qf-outcome-group">
                <label className="qf-outcome-label">Unlock Victim</label>
                <select multiple className="admin-input qf-multi-select" value={choice.outcomes.unlock_victims} onChange={(e) => handleMultiSelect(e, 'unlock_victims')}>
                  {availableVictims.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}