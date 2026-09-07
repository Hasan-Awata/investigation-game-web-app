import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomState, useRoomActions } from '../../../../context/RoomContext';
import VictimModal from './VictimModal';
import VictimCard from './VictimCard';
import { CaseUserStatus } from '../../../../types';
import type { Victim, GameCase } from '../../../../types';
import '../SharedOverlay.css';
import './CaseDetailsTab.css';

export default function CaseDetailsTab() {
  const { t } = useTranslation();
  const { room, accumulatedVictims, viewedVictims } = useRoomState();
  const { markVictimAsViewed } = useRoomActions();

  const [inspectedVictim, setInspectedVictim] = useState<Victim | null>(null);

  const gameCase: GameCase = room.game_case || {
    id: room.case_id,
    title: t('pages.gameRoom.caseDetails.missingData'),
    story: t('pages.gameRoom.caseDetails.missingDataDesc'),
    min_player_XP: 0,
    XP_on_solve: 0,
    max_strikes: 3,
    img_url: undefined,
    tags: []
  };

  const heroImageUrl = gameCase.img_url || '/placeholder-crime-scene.jpg';

  const handleInspectVictim = (victim: Victim) => {
    markVictimAsViewed(victim.id);
    setInspectedVictim(victim);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span 
          key={i} 
          style={{ color: i <= Math.round(rating) ? '#e65100' : 'rgba(255,255,255,0.15)' }}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  const userStatus = gameCase.user_status;
  const isFailed = userStatus === CaseUserStatus.FailedNoProof || userStatus === CaseUserStatus.FailedIncomplete || userStatus === CaseUserStatus.FailedStrikes;
  
  let rewardText = `${gameCase.XP_on_solve} ${t('components.caseBriefing.xp')}`;
  let rewardColor = '#e65100';

  if (userStatus === CaseUserStatus.SolvedPerfect) {
    rewardText = `0 ${t('components.caseBriefing.xp')} ${t('components.caseBriefing.perfectReplay')}`;
    rewardColor = 'var(--text-secondary)';
  } else if (userStatus === CaseUserStatus.SolvedPartial) {
    rewardText = `0 ${t('components.caseBriefing.xp')} ${t('components.caseBriefing.partialReplay')}`;
    rewardColor = 'var(--text-secondary)';
  } else if (isFailed) {
    rewardText = `${Math.floor((gameCase.XP_on_solve || 0) / 2)} ${t('components.caseBriefing.xp')} ${t('components.caseBriefing.penaltyAllowance')}`;
    rewardColor = '#d32f2f';
  }

  return (
    <div className="case-details-tab">
      
      <div 
        className="tab-hero-bg"
        style={{ backgroundImage: `url(${heroImageUrl}), url('/placeholder-crime-scene.jpg')` }}
      />
      <div className="tab-hero-overlay" />

      <div className="case-content-layer">
        
        {/* HERO WRAPPER - Forces content to the bottom of the image */}
        <div className="hero-content-wrapper">
          
          <div className="case-hero-header">
            <h1 className="case-hero-title">{gameCase.title}</h1>
            <div className="case-hero-author">
              {t('components.caseBriefing.authoredBy')} {gameCase.author_name || t('components.caseBriefing.system')}
            </div>
          </div>

          {/* THE DIVIDER LINE */}
          <div className="hero-divider-line" />

          {/* 3-COLUMN STATS GRID */}
          <div className="case-stats-grid">
            <div className="hero-stat-column">
              <div className="hero-stat-block">
                <span className="stat-label">{t('components.caseBriefing.playerRating')}</span>
                <span className="stat-value">{renderStars(gameCase.rating_stars || 0)}</span>
              </div>
              <div className="hero-stat-block">
                <span className="stat-label">{t('components.caseBriefing.difficulty')}</span>
                <span className="stat-value" style={{ color: '#d32f2f' }}>
                  {gameCase.difficulty || t('components.caseBriefing.standard')}
                </span>
              </div>
            </div>

            <div className="hero-stat-column">
              <div className="hero-stat-block">
                <span className="stat-label">{t('components.caseBriefing.estPlaytime')}</span>
                <span className="stat-value">{gameCase.estimated_playtime || t('components.caseBriefing.unknown')}</span>
              </div>
              <div className="hero-stat-block">
                <span className="stat-label">{t('components.caseBriefing.advisory')}</span>
                <span className="stat-value">
                  {gameCase.age_rating || t('components.caseBriefing.unrated')}
                </span>
              </div>
            </div>

            <div className="hero-stat-column">
              <div className="hero-stat-block">
                <span className="stat-label">{t('components.caseBriefing.accessRequirements')}</span>
                <span className="stat-value">{t('components.caseBriefing.minXp')} {gameCase.min_player_XP}</span>
              </div>
              <div className="hero-stat-block">
                <span className="stat-label">{t('components.caseBriefing.reward')}</span>
                <span className="stat-value" style={{ color: rewardColor }}>{rewardText}</span>
              </div>
            </div>
          </div>
          
        </div>

        <div className="case-details-body">
          <div className="story-text-block">
            <h2 className="section-title">
                {t('pages.gameRoom.caseDetails.officialBriefing')}
            </h2>
            {gameCase.story.split('\n').map((paragraph: string, idx: number) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>

          {/* VICTIMS SECTION */}
          {accumulatedVictims.length > 0 && (
            <div className="case-victims-section">
              <h2 className="section-title">
                {t('pages.gameRoom.caseDetails.identifiedCasualties')}
              </h2>
              
              <div className="victims-grid">
                {accumulatedVictims.map((victim: Victim, index: number) => {
                  const isNew = !viewedVictims.has(victim.id);
                  return (
                    <VictimCard 
                      key={victim.id} 
                      victim={victim} 
                      index={index}
                      isNew={isNew} 
                      onClick={handleInspectVictim} 
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      <VictimModal
        victim={inspectedVictim}
        onClose={() => setInspectedVictim(null)}
      />
    </div>
  );
}