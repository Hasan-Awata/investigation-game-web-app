import { useState } from 'react';
import { useAdminContext } from '@/pages/Admin/context/AdminContext';
import { useTargeting } from '@/context/TargetingContext';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import type { Evidence, Level, Phase, Suspect, Victim } from '@/types';
import './ChoiceEditorCard.css';

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
}

export default function ChoiceEditorCard({
  index,
  choice,
  updateChoice,
  removeChoice,
}: ChoiceEditorCardProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(
    typeof choice.id === 'string' || choice.id === undefined
  );

  const { selectedCase } = useAdminContext();
  const targeting = useTargeting();
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.choiceEditorCard;

  if (!selectedCase) return null;

  const availableEvidence = selectedCase.evidences || [];
  const availableLevels = selectedCase.phases?.flatMap(p => p.levels || []) || [];
  const availableSuspects = selectedCase.suspects || [];
  const availableVictims = selectedCase.victims || [];

  const updateOutcomes = <K extends keyof NonNullable<DraftChoice['outcomes']>>(
    key: K,
    value: NonNullable<DraftChoice['outcomes']>[K]
  ) => {
    updateChoice({ ...choice, outcomes: { ...(choice.outcomes || {}), [key]: value } });
  };

  const updateRequirements = <K extends keyof NonNullable<DraftChoice['requirements']>>(
    key: K,
    value: NonNullable<DraftChoice['requirements']>[K]
  ) => {
    updateChoice({ ...choice, requirements: { ...(choice.requirements || {}), [key]: value } });
  };

  const unlockedEv = choice.outcomes?.unlock_evidence?.map(String) || [];
  const unlockedLv = choice.outcomes?.unlock_levels?.map(String) || [];
  const unlockedSu = choice.outcomes?.unlock_suspects?.map(String) || [];
  const unlockedVi = choice.outcomes?.unlock_victims?.map(String) || [];
  const reqEv = choice.requirements?.required_evidence?.map(String) || [];

  const hasCoords = choice.text.includes('|') && !choice.text.startsWith('|');
  const coordPreview = hasCoords ? choice.text.split('|')[0].trim() : null;
  
  const isTargeting = targeting?.activeTarget === choice.id;

  return (
    <div className="choice-editor-card">
      {/* CLEAN HEADER BAR */}
      <div className="choice-editor-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="header-info-group">
          <span className="choice-index">{t.choiceIndex(index + 1)}</span>
          <span className="choice-preview">
            {choice.text ? `"${choice.text}"` : t.blankChoice}
          </span>

          {coordPreview && (
            <span className="badge-coord">📍 {coordPreview}%</span>
          )}

          {choice.outcomes?.gives_strike && (
            <span className="badge-strike">{t.strikePenaltyBadge}</span>
          )}
        </div>

        <div className="header-actions-group" onClick={(e) => e.stopPropagation()}>
          {targeting && (
            <button
              type="button"
              className={`btn-secondary target-btn ${isTargeting ? 'active' : ''}`}
              onClick={() => targeting.toggleTarget(choice.id as string | number)}
            >
              {isTargeting ? t.targetingActive : t.targetingMap}
            </button>
          )}

          <button type="button" className="btn-secondary collapse-btn" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? t.collapse : t.expand}
          </button>

          <button type="button" className="delete-btn" onClick={removeChoice} title={t.deleteTitle}>
            ✕
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE BODY CONTENT */}
      {isExpanded && (
        <div className="choice-editor-body">
          <div className="form-group">
            <label>{t.choiceTextLabel}</label>
            <input
              type="text"
              className="admin-input"
              required
              value={choice.text}
              onChange={(e) => updateChoice({ ...choice, text: e.target.value })}
              placeholder={t.choiceTextPlaceholder}
            />
          </div>

          <div className="outcomes-panel">
            <h6>{t.narrativeOutcomesTitle}</h6>

            <div className="checkbox-row strike-penalty-row">
              <input
                type="checkbox"
                checked={!!choice.outcomes?.gives_strike}
                onChange={(e) => updateOutcomes('gives_strike', e.target.checked)}
              />
              <label><strong>{t.penaltyStrikeLabel}</strong> {t.penaltyStrikeDesc}</label>
            </div>

            <div className="form-group">
              <label>{t.feedbackLabel}</label>
              <textarea
                className="admin-textarea"
                value={choice.outcomes?.feedback || ''}
                onChange={(e) => updateOutcomes('feedback', e.target.value)}
                placeholder={t.feedbackPlaceholder}
              />
            </div>

            <div className="admin-form-row">
              <div className="form-group">
                <label>{t.unlockEvidenceLabel}</label>
                <select multiple className="admin-input" value={unlockedEv} onChange={(e) => updateOutcomes('unlock_evidence', Array.from(e.target.selectedOptions, opt => Number(opt.value)))}>
                  {availableEvidence.map((ev: Evidence) => (
                    <option key={ev.id} value={ev.id.toString()}>{t.evidenceOption(ev.id, ev.title)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{t.unlockLevelsLabel}</label>
                <select multiple className="admin-input" value={unlockedLv} onChange={(e) => updateOutcomes('unlock_levels', Array.from(e.target.selectedOptions, opt => Number(opt.value)))}>
                  {availableLevels.map((lv: Level) => (
                    <option key={lv.id} value={lv.id.toString()}>{t.levelOption(lv.order_index, lv.title)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="admin-form-row">
              <div className="form-group">
                <label>{t.unlockSuspectsLabel}</label>
                <select multiple className="admin-input" value={unlockedSu} onChange={(e) => updateOutcomes('unlock_suspects', Array.from(e.target.selectedOptions, opt => Number(opt.value)))}>
                  {availableSuspects.map((su: Suspect) => (
                    <option key={su.id} value={su.id.toString()}>{su.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{t.unlockVictimsLabel}</label>
                <select multiple className="admin-input" value={unlockedVi} onChange={(e) => updateOutcomes('unlock_victims', Array.from(e.target.selectedOptions, opt => Number(opt.value)))}>
                  {availableVictims.map((vi: Victim) => (
                    <option key={vi.id} value={vi.id.toString()}>{vi.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="requirements-panel">
            <h6>{t.gatekeeperRequirementsTitle}</h6>
            <div className="form-group">
              <label>{t.requiredEvidenceLabel}</label>
              <select multiple className="admin-input" value={reqEv} onChange={(e) => updateRequirements('required_evidence', Array.from(e.target.selectedOptions, opt => Number(opt.value)))}>
                {availableEvidence.map((ev: Evidence) => (
                  <option key={ev.id} value={ev.id.toString()}>{t.evidenceOption(ev.id, ev.title)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}