import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomData } from '../../../../context/RoomContext';
import type { GameCase } from '../../../../types';
import '../SharedOverlay.css';
import caseDetailsTab from './CaseDetailsTab.module.css';

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
    <div className={caseDetailsTab['case-details-tab']}>
      <div
        className={caseDetailsTab['tab-hero-bg']}
        style={{ backgroundImage: `url(${heroImageUrl}), url('/placeholder-crime-scene.jpg')` }}
      />
      <div className={caseDetailsTab['tab-hero-overlay']} />

      <div className={caseDetailsTab['case-content-layer']}>
        <div className={caseDetailsTab['hero-content-wrapper']}>
          <div className={caseDetailsTab['case-hero-header']}>
            <h1 className={caseDetailsTab['case-hero-title']}>{gameCase.title}</h1>
            <div className={caseDetailsTab['case-hero-author']}>
              {t('components.caseBriefing.authoredBy')} {gameCase.author_name || t('components.caseBriefing.system')}
            </div>
          </div>
          <div className={caseDetailsTab['hero-divider-line']} />
        </div>

        <div className={caseDetailsTab['case-details-body']}>
          <div className={`story-text-block ${caseDetailsTab['story-text-block']}`}>
            <h2 className={caseDetailsTab['section-title']}>
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
