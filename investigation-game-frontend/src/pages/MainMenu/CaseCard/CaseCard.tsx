import { useTranslation } from 'react-i18next';
import type { GameCase } from '../../../types';
import { CaseUserStatus } from '../../../types';
import '@/i18n';
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
    <div className={`${caseCardStyles['case-card']}${isSolved ? caseCardStyles['is-solved'] : ''} ${isFailed ? caseCardStyles['is-failed'] : ''} ${needsMoreXp ? caseCardStyles['is-locked'] : ''}`}>
      
      {/* Top Image Area */}
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

      {/* Bottom Content Area */}
      <div className={caseCardStyles['case-card-content']}>
        <h3 className={caseCardStyles['case-title']}>{gameCase.title}</h3>
        {/* Sleek Horizontal Metadata Row */}
        {gameCase.story && (
          <p className={caseCardStyles['case-story']}>{gameCase.story}</p>
        )}
        
        <div className={caseCardStyles['metadataRow']}>
          {gameCase.difficulty && (
            <div className={caseCardStyles['metadataItem']}>
              <svg className={caseCardStyles['metadataIcon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>{gameCase.difficulty}</span>
            </div>
          )}
          
          <div className={`${caseCardStyles['metadataItem']} ${caseCardStyles['rewardStandard']}`}>
            <svg className={caseCardStyles['metadataIcon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12V8H4v4"/><path d="M2 6h20v12H2z"/><path d="M12 12h.01"/><path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
            </svg>
            <span className={caseCardStyles['metaValueHighlightMono']}>{gameCase.XP_on_solve} {t('components.caseBriefing.xp', 'XP')}</span>
          </div>
        </div>

      </div>
    </div>
  );
}