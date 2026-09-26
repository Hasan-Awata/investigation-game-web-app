/**
 * The four viewers, one per backend viewer strategy.
 *
 * The strategy stored on the document decides which one renders it, and the
 * detail union makes each viewer accept only the variant it can actually
 * display. PagedViewer is deliberately not exported: it is the shared paging
 * engine behind PaperViewer and TerminalViewer, not a viewer in its own right.
 */
export { default as PaperViewer } from './PaperViewer';
export type { PaperViewerProps } from './PaperViewer';

export { default as TerminalViewer } from './TerminalViewer';
export type { TerminalViewerProps } from './TerminalViewer';

export { default as MediaViewer } from './MediaViewer';
export type { MediaViewerProps } from './MediaViewer';

export { default as ArtifactViewer } from './ArtifactViewer';
export type { ArtifactViewerProps } from './ArtifactViewer';
