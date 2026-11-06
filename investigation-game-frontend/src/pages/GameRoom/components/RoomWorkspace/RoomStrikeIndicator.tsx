import { useTranslation } from 'react-i18next';
import styles from '../../GameRoomLayout.module.css';

export default function RoomStrikeIndicator({ currentStrikes, maxStrikes }: { currentStrikes: number; maxStrikes: number }) {
  const { t } = useTranslation();
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const segmentLength = Math.max(0, (circumference / maxStrikes) - 3.5);

  return (
    <div className={styles.strikesIndicator}>
      <div className={styles.strikesTooltip}>{currentStrikes}/{maxStrikes} {t('gameRoom.strikes')}</div>
      <svg width="50" height="50" viewBox="0 0 50 50" style={{ transform: 'rotate(-90deg)' }}>
        {[...Array(maxStrikes)].map((_, i) => {
          const offset = (circumference / maxStrikes) * i;
          return (
            <circle key={i} cx="25" cy="25" r={radius} fill="none"
              stroke={i < currentStrikes ? 'var(--accent-crimson, #ff4444)' : 'rgba(255, 255, 255, 0.15)'}
              strokeWidth="6" strokeDasharray={`${segmentLength} ${circumference - segmentLength}`} strokeDashoffset={-offset}
            />
          );
        })}
      </svg>
    </div>
  );
}
