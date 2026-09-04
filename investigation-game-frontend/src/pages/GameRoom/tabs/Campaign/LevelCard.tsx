import { useTranslation } from 'react-i18next';
import type { Level, Question } from '@/types';
import InterrogationPhase from './Levels/Interrogation/InterrogationPhase';
import LocationPhase from './Levels/Location/LocationPhase';
import WiretapPhase from './Levels/Wiretap/WiretapPhase';
import './LevelCard.css';

interface LevelCardProps {
  level: Level;
  status: string;
  isExpanded: boolean;
  isDiscovered: boolean;
  displayTitle: string;
  displayDesc: string;
  isHost: boolean;
  isInitiating: boolean;
  isSubmitting: boolean;
  totalPlayers: number;
  onToggleExpand: (levelId: number, status: string) => void;
  onInitiatePhase: (levelId: number) => void;
  getQuestionConsensus: (question: Question) => any;
  handleSubmitTheory: (theory: any) => Promise<void> | void;
}

export default function LevelCard({
  level,
  status,
  isExpanded,
  isDiscovered,
  displayTitle,
  displayDesc,
  isHost,
  isInitiating,
  isSubmitting,
  totalPlayers,
  onToggleExpand,
  onInitiatePhase,
  getQuestionConsensus,
  handleSubmitTheory
}: LevelCardProps) {
  const { t } = useTranslation();

  return (
    <div className={`roadmap-node ${status}`}>
      <div className="timeline-connector">
        <div className="node-indicator">
          <div className="indicator-core">
            {status === 'completed' && '✓'}
            {status === 'locked' && '🔒'}
          </div>
        </div>
        <div className="node-line">
          <div className="data-stream"></div>
        </div>
      </div>

      <div
        className={`node-content glass-panel ${status !== 'locked' ? 'clickable' : ''}`}
        onClick={() => onToggleExpand(level.id, status)}
      >
        <div className="tactical-brackets top-left"></div>
        <div className="tactical-brackets bottom-right"></div>
        
        <div className="node-main-card">
          <div 
            className="node-image" 
            style={{ backgroundImage: `url(${level.img_url || '/placeholder-crime-scene.jpg'})` }}
          >
            <div className="node-image-overlay">
              <div className="scanline"></div>
            </div>
          </div>
          <div className="node-details">
            <span className="node-phase">
              {t('pages.gameRoom.campaign.lead', { id: level.order_index.toString().padStart(3, '0') })}
            </span>
            <h3 className="node-title">{displayTitle}</h3>
            <p className="node-desc">{displayDesc}</p>
            {status === 'active' && (
              <div className="active-badge">
                [ {t('pages.gameRoom.campaign.activeInvestigation')} ]
              </div>
            )}
          </div>
        </div>

        {isExpanded && isDiscovered && (
          <div className="node-questions-drawer" onClick={(e) => e.stopPropagation()}>
            {status === 'available' && (
              <div className="host-warning-container">
                <p className="host-warning-text">
                  {isHost ? t('pages.gameRoom.campaign.hostInitiateWarning') : t('pages.gameRoom.campaign.awaitingHost')}
                </p>
                {isHost && (
                  <button 
                    className="btn-primary tactical-btn" 
                    onClick={() => onInitiatePhase(level.id)} 
                    disabled={isInitiating}
                  >
                    {isInitiating ? t('pages.gameRoom.campaign.lockingCoordinator') : t('pages.gameRoom.campaign.commenceInvestigation')}
                  </button>
                )}
              </div>
            )}

            {(status === 'active' || status === 'completed') && level.questions && (
              <>
                {level.presentation_type === 'interrogation' ? (
                  <InterrogationPhase 
                    getQuestionConsensus={getQuestionConsensus} 
                    handleSubmitTheory={handleSubmitTheory} 
                    isHost={isHost} 
                    isSubmitting={isSubmitting} 
                    level={level} 
                    status={status} 
                    totalPlayers={totalPlayers} 
                  />
                ) : level.presentation_type === 'location' ? (
                  <LocationPhase 
                    handleSubmitTheory={handleSubmitTheory} 
                    isHost={isHost} 
                    isSubmitting={isSubmitting} 
                    level={level} 
                    status={status} 
                  />
                ) : level.presentation_type === 'wiretap' ? (
                  <WiretapPhase 
                    getQuestionConsensus={getQuestionConsensus} 
                    handleSubmitTheory={handleSubmitTheory} 
                    isHost={isHost} 
                    isSubmitting={isSubmitting} 
                    level={level} 
                    status={status} 
                    totalPlayers={totalPlayers} 
                  />
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}