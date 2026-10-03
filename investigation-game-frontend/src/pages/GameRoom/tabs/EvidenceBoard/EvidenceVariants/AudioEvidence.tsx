import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types';
import audioEvidence from './AudioEvidence.module.css';

export default function AudioEvidence({ evidence }: { evidence: Evidence }) {
  const { t } = useTranslation();

  return (
    <div className={`audio-variant ${audioEvidence['cassette-tape']}`}>
      {/* Printed directly on the dark plastic casing */}
      <div className={audioEvidence['cassette-top-area']}>
        <div className={audioEvidence['label-header']}>
          <span className={audioEvidence['audio-icon']}>⏺</span>
          <span className={audioEvidence['tape-indicator']}>{t('pages.gameRoom.evidence.variants.audio.aSide')}</span>
        </div>
      </div>

      {/* The clear plastic window showing the tape reels */}
      <div className={audioEvidence['cassette-window']}>
        <div className={`${audioEvidence['reel']} ${audioEvidence['left-reel']}`}></div>
        <div className={`${audioEvidence['reel']} ${audioEvidence['right-reel']}`}></div>
      </div>

      {/* The bottom mechanical casing */}
      <div className={audioEvidence['cassette-bottom']}>
        <div className={`${audioEvidence['screw']} ${audioEvidence['left-screw']}`}></div>

        {/* The piece of white tape slapped on the bottom */}
        <div className={audioEvidence['title-tape']}>
          <h4 className={audioEvidence['evidence-title']}>{evidence.title}</h4>
        </div>

        <div className={`${audioEvidence['screw']} ${audioEvidence['right-screw']}`}></div>
      </div>
    </div>
  );
}