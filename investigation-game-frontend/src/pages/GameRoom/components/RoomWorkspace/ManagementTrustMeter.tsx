import { useTranslation } from 'react-i18next';
import styles from '../../GameRoomLayout.module.css';

export default function ManagementTrustMeter({ trust }: { trust: number }) {
  const { t, i18n } = useTranslation();
  const label = t('gameRoom.managementTrust');
  const percentage = new Intl.NumberFormat(i18n?.language || 'en', { style: 'percent' }).format(trust / 100);

  return (
    <div
      className={styles.managementTrust}
      role="meter"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={trust}
      aria-valuetext={percentage}
    >
      <svg viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="6" aria-hidden="true">
        <circle cx="25" cy="25" r="20" strokeOpacity="0.25" />
        {trust > 0 && (
          <circle
            cx="25" cy="25" r="20"
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
