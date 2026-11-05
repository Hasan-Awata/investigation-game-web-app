import { useTranslation } from 'react-i18next';
import styles from './CaseRating.module.css';

const starPoints = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26';

export default function CaseRating({ rating }: { rating?: number }) {
  const { t } = useTranslation();
  const validRating = typeof rating === 'number' && Number.isFinite(rating) && rating > 0 && rating <= 5 ? rating : 0;
  const whole = Math.floor(validRating);
  const hasHalf = validRating > whole;
  const label = validRating
    ? t('components.caseBriefing.starRating', { rating: whole + (hasHalf ? 0.5 : 0) })
    : t('components.caseBriefing.unrated');

  return (
    <span className={styles.rating} role="img" aria-label={label}>
      {[0, 1, 2, 3, 4].map(index => (
        <svg key={index} className={styles.star} viewBox="0 0 24 24" aria-hidden="true">
          {index === whole && hasHalf && (
            <polygon className={styles.halfFill} points={starPoints} fill="currentColor" />
          )}
          <polygon points={starPoints} fill={index < whole ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}
