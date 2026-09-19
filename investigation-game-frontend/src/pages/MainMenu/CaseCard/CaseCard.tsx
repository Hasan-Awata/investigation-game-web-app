import { useTranslation } from 'react-i18next';
import type { GameCase } from '../../../types';
import { CaseUserStatus } from '../../../types';
import '@/i18n';
import './CaseCard.css';

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
    <div className={`case-card ${isSolved ? 'is-solved' : ''} ${isFailed ? 'is-failed' : ''} ${needsMoreXp ? 'is-locked' : ''}`}>
      
      {/* Top Image Area */}
      <div className="case-card-hero">
        <div
          className="case-card-background"
          style={{ backgroundImage: `url(${imageUrl || '/placeholder-crime-scene.jpg'})` }}
        />
        <div className="case-card-overlay" />

        {isSolved && (
          <div className="solved-stamp-container">
            <span className="solved-stamp">{t('components.caseCard.caseClosed')}</span>
          </div>
        )}

        {isFailed && (
          <div className="solved-stamp-container">
            <span className="solved-stamp failed-stamp">
              {t('components.caseCard.failed')}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Content Area */}
      <div className="case-card-content">
        <h3 className="case-title">{gameCase.title}</h3>
        {/* Sleek Horizontal Metadata Row */}
        {gameCase.story && (
          <p className="case-story">{gameCase.story}</p>
        )}
        
        <div className="metadataRow">
          {gameCase.difficulty && (
            <div className="metadataItem">
              <svg className="metadataIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>{gameCase.difficulty}</span>
            </div>
          )}
          
          <div className="metadataItem rewardStandard">
            <svg className="metadataIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12V8H4v4"/><path d="M2 6h20v12H2z"/><path d="M12 12h.01"/><path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
            </svg>
            <span className="metaValueHighlightMono">{gameCase.XP_on_solve} {t('components.caseBriefing.xp', 'XP')}</span>
          </div>
        </div>

      </div>
    </div>
  );
}