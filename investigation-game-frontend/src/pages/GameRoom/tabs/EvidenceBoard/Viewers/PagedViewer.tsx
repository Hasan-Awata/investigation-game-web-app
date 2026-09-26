import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FC, ReactNode } from 'react';
import type { EvidencePage, PagedEvidenceDetail } from '@/types/evidence';
import ErrorBoundary from '@/components/ErrorBoundary';
import { renderBlock } from './BlockRenderer';
import ViewersContainer from './ViewersContainer';
import styles from './PagedViewer.module.css';
import './themes.css';

interface PagedViewerProps {
  /**
   * Only the paged half of the detail union, so the strategy and finish needed
   * below are known to exist rather than optional.
   */
  evidence: PagedEvidenceDetail;
  pages: EvidencePage[];
  /**
   * Strategy-specific decoration, supplied by the Paper and Terminal viewers.
   *
   * This component owns pagination and block rendering only. Deciding what a
   * given strategy looks like belongs to its own viewer, which is why the
   * terminal chrome arrives as a prop rather than being switched on here.
   */
  chrome?: ReactNode;
}

/**
 * Stable empty lookup, so a response without the map costs no allocation and
 * never becomes a new object identity on every render.
 */
const NO_SIGNATURE_PATHS: Record<string, string> = {};

const PagedViewer: FC<PagedViewerProps> = ({ evidence, pages, chrome }) => {
  const { t } = useTranslation();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const pageList = pages;
  const activePage = pageList[currentPageIndex] ?? { id: '', blocks: [] };
  const isFirstPage = currentPageIndex === 0;
  const isLastPage = currentPageIndex >= pageList.length - 1;

  // The page index is per document, so reopening a different evidence must not
  // land on the previous document's page.
  const documentKey = `${evidence.id}`;

  // A signature block resolves its file through this map. Defaulting it keeps
  // an absent lookup on the pad's MISSING placeholder instead of throwing on
  // the first access.
  const signaturePaths = evidence.signature_paths ?? NO_SIGNATURE_PATHS;

  return (
    <ViewersContainer>
      <div
        key={documentKey}
        className={styles.wrapper}
        data-strategy={evidence.viewer_strategy}
        data-finish={evidence.paper_finish ?? undefined}
      >
        {chrome}

        {activePage.blocks.map((block) => (
          // A block is isolated so one malformed document cannot blank the
          // evidence the player is reading.
          <ErrorBoundary
            key={block.id}
            isLocal={true}
            fallbackMessage="This block could not be displayed."
          >
            {renderBlock({ block, signaturePaths })}
          </ErrorBoundary>
        ))}

        {pageList.length > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              disabled={isFirstPage}
              onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
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
              onClick={() => setCurrentPageIndex((prev) => Math.min(pageList.length - 1, prev + 1))}
            >
              {t('pages.gameRoom.evidence.viewers.universal.next', 'Next')} &#8594;
            </button>
          </div>
        )}
      </div>
    </ViewersContainer>
  );
};

export default PagedViewer;
