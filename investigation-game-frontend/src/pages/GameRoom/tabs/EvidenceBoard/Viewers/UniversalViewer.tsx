import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FC } from 'react';
import type { Evidence } from '@/types/evidence';
import ErrorBoundary from '@/components/ErrorBoundary';
import { WidgetRegistry } from './WidgetRegistry';
import styles from './UniversalViewer.module.css';

interface UniversalViewerProps {
  evidence: Evidence;
}

const UnsupportedWidget: FC<{ type: string }> = ({ type }) => (
  <div className={styles.unsupportedWidget}>
    <span className={styles.unsupportedTag}>[ UNRECOGNIZED BLOCK ]</span>
    <span className={styles.unsupportedType}>{type}</span>
  </div>
);

const UniversalViewer: FC<UniversalViewerProps> = ({ evidence }) => {
  const { t } = useTranslation();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const { pages = [], theme } = evidence;
  const pageList = pages ?? [];
  const activePage = pageList[currentPageIndex] || { blocks: [] };
  const isFirstPage = currentPageIndex === 0;
  const isLastPage = currentPageIndex === pageList.length - 1 || pageList.length === 0;

  return (
    <div className={`${styles.wrapper} ${theme || ''}`.trim()}>
      {activePage.blocks.map((block) => {
        const Widget = WidgetRegistry[block.type];

        return (
          <ErrorBoundary
            key={`${block.id}`}
            isLocal={true}
            fallbackMessage="Widget corruption detected."
          >
            {Widget ? <Widget {...block.props} /> : <UnsupportedWidget type={block.type} />}
          </ErrorBoundary>
        );
      })}

      {pageList.length > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            disabled={isFirstPage}
            onClick={() => setCurrentPageIndex(prev => prev - 1)}
          >
            &#8592; {t('pages.gameRoom.evidence.viewers.universal.prev', 'Prev')}
          </button>
          <span>
            {t('pages.gameRoom.evidence.viewers.universal.page', 'Page')} {currentPageIndex + 1}{' '}
            {t('pages.gameRoom.evidence.viewers.universal.of', 'of')} {pageList.length}
          </span>
          <button
            type="button"
            disabled={isLastPage}
            onClick={() => setCurrentPageIndex(prev => prev + 1)}
          >
            {t('pages.gameRoom.evidence.viewers.universal.next', 'Next')} &#8594;
          </button>
        </div>
      )}
    </div>
  );
};

export default UniversalViewer;