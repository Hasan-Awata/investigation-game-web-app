import { useTranslation } from 'react-i18next';
import type { GameCase } from '../../../types';
import { CaseUserStatus } from '../../../types';
import '@/i18n';
import CaseRating from '../CaseMetadataBadge/CaseRating';
import CaseMetadataBadge from '../CaseMetadataBadge/CaseMetadataBadge';
import caseCardStyles from './CaseCard.module.css';

interface CaseCardProps {
  gameCase: GameCase;
  imageUrl?: string;
  userXp?: number;
}

export default function CaseCard({ gameCase, imageUrl, userXp = 0 }: CaseCardProps) {
  const { t } = useTranslation();
  
  const isSolved = gameCase.user_status === CaseUserStatus.SolvedPerfect ||
                   gameCase.user_status === CaseUserStatus.SolvedPartial;

  const isFailed = gameCase.user_status === CaseUserStatus.FailedNoProof ||
                   gameCase.user_status === CaseUserStatus.FailedIncomplete ||
                   gameCase.user_status === CaseUserStatus.FailedStrikes;

  const needsMoreXp = userXp < (gameCase.min_player_XP || 0);

  return (
    <div className={`${caseCardStyles['case-card']} ${isSolved ? caseCardStyles['is-solved'] : ''} ${isFailed ? caseCardStyles['is-failed'] : ''} ${needsMoreXp ? caseCardStyles['is-locked'] : ''}`}>
      
      <div className={caseCardStyles['case-card-hero']}>
        <div
          className={caseCardStyles['case-card-background']}
          style={{ backgroundImage: `url(${imageUrl || '/placeholder-crime-scene.jpg'})` }}
        />
        <div className={caseCardStyles['case-card-overlay']} />

        {isSolved && (
          <div className={caseCardStyles['solved-stamp-container']}>
            <span className={caseCardStyles['solved-stamp']}>{t('components.caseCard.caseClosed')}</span>
          </div>
        )}

        {isFailed && (
          <div className={caseCardStyles['solved-stamp-container']}>
            <span className={`${caseCardStyles['solved-stamp']} ${caseCardStyles['failed-stamp']}`}>
              {t('components.caseCard.failed')}
            </span>
          </div>
        )}
      </div>

      <div className={caseCardStyles['case-card-content']}>
        <h3 className={caseCardStyles['case-title']}>
          <button type="button" className={caseCardStyles.titleButton}>{gameCase.title}</button>
        </h3>
        {gameCase.story && (
          <p className={caseCardStyles['case-story']}>{gameCase.story}</p>
        )}
        
        <div className={caseCardStyles['metadataRow']}>
          {gameCase.difficulty && (
            <CaseMetadataBadge kind="difficulty">{gameCase.difficulty}</CaseMetadataBadge>
          )}
          <CaseRating rating={gameCase.rating_stars} />
          <CaseMetadataBadge kind="reward">{gameCase.XP_on_solve}</CaseMetadataBadge>
          <CaseMetadataBadge kind="price">{t('components.caseBriefing.freePrice')}</CaseMetadataBadge>
        </div>

      </div>
    </div>
  );
}
