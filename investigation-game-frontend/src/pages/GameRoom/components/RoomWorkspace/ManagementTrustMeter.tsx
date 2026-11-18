import { useTranslation } from 'react-i18next';
import styles from '../../GameRoomLayout.module.css';

export default function ManagementTrustMeter({ trust }: { trust: number }) {
  const { t, i18n } = useTranslation();
  const label = t('gameRoom.managementTrust');
  const percentage = new Intl.NumberFormat(i18n?.language || 'en', { style: 'percent' }).format(trust / 100);
  const trustBand = trust > 75 ? 'success'
    : trust > 50 ? 'olive'
    : trust > 25 ? 'amber'
    : 'crimson';

  return (
    <div
      className={styles.managementTrust}
      data-trust-band={trustBand}
      role="meter"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={trust}
      aria-valuetext={percentage}
    >
      <svg viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" aria-hidden="true">
        {trust > 0 && (
          <circle
            cx="25" cy="25" r="20.5"
            pathLength="100"
            strokeDasharray={trust < 100 ? `${trust} 100` : undefined}
            transform="rotate(-90 25 25)"
          />
        )}
      </svg>
      <bdi className={styles.managementTrustPercentage} aria-hidden="true">{percentage}</bdi>
      <span className={styles.managementTrustTooltip} aria-hidden="true">{label}</span>
    </div>
  );
}
