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