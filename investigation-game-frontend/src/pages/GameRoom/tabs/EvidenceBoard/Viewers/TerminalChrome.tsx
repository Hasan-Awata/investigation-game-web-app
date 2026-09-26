import { useTranslation } from 'react-i18next';
import type { FC } from 'react';
import styles from './TerminalChrome.module.css';

const TerminalChrome: FC = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.chrome}>
      <header>
        <span className={styles.windowDots} aria-hidden="true">
          <span className={styles.dotRed} />
          <span className={styles.dotAmber} />
          <span className={styles.dotGreen} />
        </span>
        <span className={styles.windowTitle}>
          {t('pages.gameRoom.evidence.viewers.universal.terminalTitle', 'DIGITAL_FORENSICS_v3.4.1')}
        </span>
      </header>
      <div className={styles.footer}>
        <span className={styles.promptLine}>
          <span className={styles.promptUser}>root@investigation</span>
          <span className={styles.promptPath}>:~$</span>
        </span>
        <span className={styles.cursor}>▊</span>
      </div>
    </div>
  );
};

export default TerminalChrome;