import { useTranslation } from 'react-i18next';
import LanguageToggle from '@/components/LanguageToggle';
import styles from './GameRoomSettings.module.css';

export default function GameRoomSettings() {
  const { t } = useTranslation();

  return (
    <section className={styles.settings} aria-label={t('gameRoom.settings.title')}>
      <h3 className={styles.heading}>{t('gameRoom.settings.title')}</h3>
      <div className={styles.languageRow}>
        <span>{t('gameRoom.settings.language')}</span>
        <LanguageToggle />
      </div>
    </section>
  );
}
