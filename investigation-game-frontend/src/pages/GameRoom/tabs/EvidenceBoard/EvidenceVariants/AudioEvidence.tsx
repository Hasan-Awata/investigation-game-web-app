import { useTranslation } from 'react-i18next';
import { CassettePlayer } from '@/components/CassettePlayer';
import type { Evidence } from '@/types';
import { assetUrl } from '@/utils/assetUrl';
import '@/components/CassettePlayer.css';
import styles from './AudioEvidence.module.css';

interface AudioEvidenceProps {
  evidence: Evidence;
  preview?: boolean;
}

export default function AudioEvidence({ evidence, preview = true }: AudioEvidenceProps) {
  const { t } = useTranslation();
  const audioLabel = t('pages.gameRoom.evidence.modal.types.audio');
  const title = evidence.title || audioLabel;
  const fallbackUrl = evidence.evidence_type === 'audio' ? evidence.metadata?.url : undefined;
  const src = assetUrl(evidence.audio_url || evidence.img_url || (typeof fallbackUrl === 'string' ? fallbackUrl : ''));

  if (!src && !preview) {
    return <p className={styles.missingAudio} role="status">{t('pages.gameRoom.evidence.viewers.media.noMediaFound')}</p>;
  }

  const player = (
    <CassettePlayer
      key={src}
      className={preview ? `${styles.player} ${styles.preview}` : styles.player}
      dir="ltr"
      inert={preview || undefined}
      audioSrc={src}
      preload={preview ? 'none' : 'metadata'}
      trackTitle={title}
      archiveLabel={audioLabel}
      catalogueNumber=""
      sideLabel={t('pages.gameRoom.evidence.variants.audio.aSide')}
      loop={false}
    />
  );

  return preview ? (
    <div className={styles.previewFrame} data-cassette-player role="img" aria-label={title}>
      {player}
      <div className={styles.previewTitle} aria-hidden="true">
        <span dir="auto">{title}</span>
      </div>
    </div>
  ) : player;
}
