import { useTranslation } from 'react-i18next';

export default function RoomSyncStatus({ canRetry }: { canRetry: boolean }) {
  const { t } = useTranslation();
  return <p role="status">{canRetry
    ? t('pages.gameRoom.syncDelayed', 'Unable to refresh progress. Showing the last saved state; retrying automatically.')
    : t('pages.gameRoom.syncStopped')} {!canRetry && <a href="/">{t('pages.gameRoom.returnToMenu')}</a>}</p>;
}
