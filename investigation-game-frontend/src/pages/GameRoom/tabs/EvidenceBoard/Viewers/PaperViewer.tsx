import type { FC } from 'react';
import type { EvidencePage, PaperEvidenceDetail } from '@/types/evidence';
import PagedViewer from './PagedViewer';

/**
 * A physical sheet of paper.
 *
 * The finish is on the variant, not optional on the viewer, so the stock the
 * document is drawn on is a type-level fact rather than a value read at render
 * time. Pagination and block rendering are the paged viewer's job.
 */
export interface PaperViewerProps {
  evidence: PaperEvidenceDetail;
  pages: EvidencePage[];
}

const PaperViewer: FC<PaperViewerProps> = ({ evidence, pages }) => (
  <PagedViewer evidence={evidence} pages={pages} />
);

export default PaperViewer;
