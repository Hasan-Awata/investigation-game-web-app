import type { FC } from 'react';
import type { EvidencePage, TerminalEvidenceDetail } from '@/types/evidence';
import PagedViewer from './PagedViewer';
import TerminalChrome from './TerminalChrome';

/**
 * A captured terminal session.
 *
 * Identical paging to paper, wrapped in the CRT chrome. The chrome is passed
 * down rather than switched on inside the paged viewer so that "what a terminal
 * looks like" is answered in one place.
 */
export interface TerminalViewerProps {
  evidence: TerminalEvidenceDetail;
  pages: EvidencePage[];
}

const TerminalViewer: FC<TerminalViewerProps> = ({ evidence, pages }) => (
  <PagedViewer evidence={evidence} pages={pages} chrome={<TerminalChrome />} />
);

export default TerminalViewer;
