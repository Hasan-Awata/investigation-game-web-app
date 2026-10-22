import { useState } from 'react';
import { useAdminContext } from '@/pages/Admin/context/AdminContext.shared';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import { getChoiceCoordinate, type ChoiceCoordinate } from '@/pages/Admin/utils/coordinates';
import type { Evidence, Level, Character } from '@/types';
import choiceEditorCardStyles from './ChoiceEditorCard.module.css';
import adminDashboard from '../../AdminDashboard.module.css';

export interface DraftChoice {
  id?: number | string;
  text: string;
  coordinate?: ChoiceCoordinate;
  outcomes?: {
    unlock_evidence?: number[];
    unlock_levels?: number[];
    unlock_location_points?: number[];
    character_updates?: { id: number; is_unlocked?: boolean; status?: string }[];
    next_question_id?: number | null;
    gives_strike?: boolean;
    feedback?: string;
  };
  requirements?: {
    required_evidence?: number[];
    required_choices?: number[];
  };
}

interface ChoiceEditorCardProps {
  index: number;
  choice: DraftChoice;
  updateChoice: (updated: DraftChoice) => void;
  removeChoice: () => void;
  isTargeting?: boolean;
  onToggleTarget?: () => void;
}

export default function ChoiceEditorCard({
  index,
  choice,
  updateChoice,
  removeChoice,
  isTargeting: propIsTargeting,
  onToggleTarget
}: ChoiceEditorCardProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(
    typeof choice.id === 'string' || choice.id === undefined
  );

  const { selectedCase } = useAdminContext();
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.choiceEditorCard;

  if (!selectedCase) return null;

  const availableEvidence = selectedCase.evidences || [];
  const availableLevels = selectedCase.zones?.flatMap(z => z.levels || []) || [];
  const availableLocationPoints = availableLevels
    .filter(level => level.presentation_type === 'location')
    .flatMap(level => level.questions ?? [])
    .flatMap(question => question.choices ?? [])
    .filter(point => !!getChoiceCoordinate(point));
  const availableCharacters = selectedCase.characters || [];
  
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
  const unlockedPoints = choice.outcomes?.unlock_location_points?.map(String) || [];
  const reqEv = choice.requirements?.required_evidence?.map(String) || [];

  const unlockedCh = choice.outcomes?.character_updates?.filter(u => u.is_unlocked).map(u => String(u.id)) || [];
  const deceasedCh = choice.outcomes?.character_updates?.filter(u => u.status === 'deceased').map(u => String(u.id)) || [];

  const handleCharacterUpdate = (newUnlockedIds: number[], newDeceasedIds: number[]) => {
    const updatesMap = new Map();
    newUnlockedIds.forEach(id => updatesMap.set(id, { id, is_unlocked: true }));
    newDeceasedIds.forEach(id => {
        const existing = updatesMap.get(id) || { id };
        existing.status = 'deceased';
        updatesMap.set(id, existing);
    });
    updateOutcomes('character_updates', Array.from(updatesMap.values()));
  };

  const coordinate = getChoiceCoordinate(choice);
  const coordPreview = coordinate ? `${coordinate.x},${coordinate.y}` : null;
  
  const isTargeting = propIsTargeting !== undefined ? propIsTargeting : false;
  const canTarget = onToggleTarget !== undefined;

  return (
    <div className={choiceEditorCardStyles['choice-editor-card']}>
      {/* CLEAN HEADER BAR */}
      <div className={choiceEditorCardStyles['choice-editor-header']} onClick={() => setIsExpanded(!isExpanded)}>
        <div className={choiceEditorCardStyles['header-info-group']}>
          <span className={choiceEditorCardStyles['choice-index']}>{t.choiceIndex(index + 1)}</span>
          <span className={choiceEditorCardStyles['choice-preview']}>
            {choice.text ? `"${choice.text}"` : t.blankChoice}
          </span>

          {coordPreview && (
            <span className={choiceEditorCardStyles['badge-coord']}>📍 {coordPreview}%</span>
          )}

          {choice.outcomes?.gives_strike && (
            <span className={choiceEditorCardStyles['badge-strike']}>{t.strikePenaltyBadge}</span>
          )}
        </div>

        <div className={choiceEditorCardStyles['header-actions-group']} onClick={(e) => e.stopPropagation()}>
          {canTarget && (
            <button
              type="button"
              className={`btn-secondary ${choiceEditorCardStyles['target-btn']} ${isTargeting ? choiceEditorCardStyles['active'] : ''}`}
              onClick={() => onToggleTarget ? onToggleTarget() : undefined}
            >
              {isTargeting ? t.targetingActive : t.targetingMap}
            </button>
          )}

          <button type="button" className={`btn-secondary ${choiceEditorCardStyles['collapse-btn']}`} onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? t.collapse : t.expand}
          </button>

          <button type="button" className={choiceEditorCardStyles['delete-btn']} onClick={removeChoice} title={t.deleteTitle}>
            ✕
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE BODY CONTENT */}
      {isExpanded && (
        <div className={choiceEditorCardStyles['choice-editor-body']}>
          <div className={adminDashboard['form-group']}>
            <label>{t.choiceTextLabel}</label>
            <input
              type="text"
              className={adminDashboard['admin-input']}
              required
              value={choice.text}
              onChange={(e) => updateChoice({ ...choice, text: e.target.value })}
              placeholder={t.choiceTextPlaceholder}
            />
          </div>

          <div className={choiceEditorCardStyles['outcomes-panel']}>
            <h6>{t.narrativeOutcomesTitle}</h6>

            <div className={`${choiceEditorCardStyles['checkbox-row']} ${choiceEditorCardStyles['strike-penalty-row']}`}>
              <input
                type="checkbox"
                checked={!!choice.outcomes?.gives_strike}
                onChange={(e) => updateOutcomes('gives_strike', e.target.checked)}
              />
              <label><strong>{t.penaltyStrikeLabel}</strong> {t.penaltyStrikeDesc}</label>
            </div>

            <div className={adminDashboard['form-group']}>
              <label>{t.feedbackLabel}</label>
              <textarea
                className={adminDashboard['admin-textarea']}
                value={choice.outcomes?.feedback || ''}
                onChange={(e) => updateOutcomes('feedback', e.target.value)}
                placeholder={t.feedbackPlaceholder}
              />
            </div>

            <div className={adminDashboard['admin-form-row']}>
              <div className={adminDashboard['form-group']}>
                <label>{t.unlockEvidenceLabel}</label>
                <select multiple className={adminDashboard['admin-input']} value={unlockedEv} onChange={(e) => updateOutcomes('unlock_evidence', Array.from(e.target.selectedOptions, opt => Number(opt.value)))}>
                  {availableEvidence.map((ev: Evidence) => (
                    <option key={ev.id} value={ev.id.toString()}>{t.evidenceOption(ev.id, ev.title)}</option>
                  ))}
                </select>
              </div>
              <div className={adminDashboard['form-group']}>
                <label>{t.unlockLevelsLabel}</label>
                <select multiple className={adminDashboard['admin-input']} value={unlockedLv} onChange={(e) => updateOutcomes('unlock_levels', Array.from(e.target.selectedOptions, opt => Number(opt.value)))}>
                  {availableLevels.map((lv: Level) => (
                    <option key={lv.id} value={lv.id.toString()}>{t.levelOption(lv.order_index, lv.title)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={adminDashboard['form-group']}>
              <label>{t.unlockLocationPointsLabel}</label>
              <select multiple className={adminDashboard['admin-input']} value={unlockedPoints} onChange={(e) => updateOutcomes('unlock_location_points', Array.from(e.target.selectedOptions, opt => Number(opt.value)))}>
                {availableLocationPoints.filter(point => typeof point.id === 'number').map(point => (
                  <option key={point.id} value={String(point.id)}>{getChoiceCoordinate(point)?.label || point.text}</option>
                ))}
              </select>
            </div>

            <div className={adminDashboard['admin-form-row']}>
              <div className={adminDashboard['form-group']}>
                <label>{t.unlockCharactersLabel}</label>
                <select multiple className={adminDashboard['admin-input']} value={unlockedCh} onChange={(e) => handleCharacterUpdate(Array.from(e.target.selectedOptions, opt => Number(opt.value)), deceasedCh.map(Number))}>
                  {availableCharacters.map((c: Character) => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
                </select>
              </div>
              <div className={adminDashboard['form-group']}>
                <label style={{ color: 'var(--accent-crimson)' }}>{t.markDeceasedLabel}</label>
                <select multiple className={adminDashboard['admin-input']} value={deceasedCh} onChange={(e) => handleCharacterUpdate(unlockedCh.map(Number), Array.from(e.target.selectedOptions, opt => Number(opt.value)))}>
                  {availableCharacters.map((c: Character) => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className={choiceEditorCardStyles['requirements-panel']}>
            <h6>{t.gatekeeperRequirementsTitle}</h6>
            <div className={adminDashboard['form-group']}>
              <label>{t.requiredEvidenceLabel}</label>
              <select multiple className={adminDashboard['admin-input']} value={reqEv} onChange={(e) => updateRequirements('required_evidence', Array.from(e.target.selectedOptions, opt => Number(opt.value)))}>
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
