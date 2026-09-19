import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomData } from '../../../../context/RoomContext';
import type { GameCase } from '../../../../types';
import '../SharedOverlay.css';
import './CaseDetailsTab.css';

const CaseDetailsTab = () => {
  const { t } = useTranslation();
  const { room } = useRoomData();

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

  return (
    <div className="case-details-tab">
      <div
        className="tab-hero-bg"
        style={{ backgroundImage: `url(${heroImageUrl}), url('/placeholder-crime-scene.jpg')` }}
      />
      <div className="tab-hero-overlay" />

      <div className="case-content-layer">
        <div className="hero-content-wrapper">
          <div className="case-hero-header">
            <h1 className="case-hero-title">{gameCase.title}</h1>
            <div className="case-hero-author">
              {t('components.caseBriefing.authoredBy')} {gameCase.author_name || t('components.caseBriefing.system')}
            </div>
          </div>
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
        </div>
      </div>
    </div>
  );
}

export default React.memo(CaseDetailsTab);
