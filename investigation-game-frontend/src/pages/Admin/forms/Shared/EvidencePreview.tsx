import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { FC } from 'react';
import {
  EvidenceType,
  ViewerStrategy,
  type BlockSchema,
  type DraftEvidencePage,
  type PaperEvidenceDetail,
  type PaperFinish,
  type SignatureOption,
  type TerminalEvidenceDetail,
} from '@/types/evidence';
import { PaperViewer, TerminalViewer } from '@/pages/GameRoom/tabs/EvidenceBoard/Viewers';
import { coercePages } from './previewBlocks';
import styles from './EvidencePreview.module.css';

/**
 * A live preview of the document being authored.
 *
 * The important property here is that this is not a second renderer. It builds
 * the same `PaperEvidenceDetail` / `TerminalEvidenceDetail` the room detail
 * route returns and hands it to the same PaperViewer and TerminalViewer a
 * player sees, so the preview cannot drift from the real thing: a block that
 * looks right here looks right there.
 *
 * The other half is that half-finished input survives the trip. Authoring deals
 * in draft blocks whose props are still partial, and the viewers accept only
 * validated blocks, so `coercePages` bridges the two. See `./previewBlocks`.
 */

/** Stands in for the identifiers a real document would have. */
const PREVIEW_ID = 0;

export interface EvidencePreviewProps {
  strategy: ViewerStrategy;
  finish: PaperFinish;
  pages: DraftEvidencePage[];
  blocks: BlockSchema[];
  signatures: SignatureOption[];
  evidenceType?: EvidenceType;
}

const EvidencePreview: FC<EvidencePreviewProps> = ({
  strategy,
  finish,
  pages,
  blocks,
  signatures,
  evidenceType = EvidenceType.Document,
}) => {
  const { t } = useTranslation();

  // Rebuilt on every keystroke, which is the point: this is the live preview.
  const { paper, terminal } = useMemo(() => {
    const contentPayload = { pages: coercePages(pages, blocks) };
    const signaturePaths = Object.fromEntries(signatures.map((s) => [String(s.id), s.path]));

    const base = {
      id: PREVIEW_ID,
      title: '',
      description: null,
      evidence_type: evidenceType,
      is_vital_for_conviction: false,
      assets: [],
      media: { image: null, audio: null, model_3d: null },
      signature_paths: signaturePaths,
    };

    return {
      paper: {
        ...base,
        viewer_strategy: ViewerStrategy.Paper,
        paper_finish: finish,
        content_payload: contentPayload,
      } satisfies PaperEvidenceDetail,
      terminal: {
        ...base,
        viewer_strategy: ViewerStrategy.Terminal,
        paper_finish: null,
        content_payload: contentPayload,
      } satisfies TerminalEvidenceDetail,
    };
  }, [pages, blocks, signatures, finish, evidenceType]);

  if (strategy === ViewerStrategy.Paper) {
    return (
      <div className={styles.preview} data-testid="evidence-preview">
        <PaperViewer evidence={paper} pages={paper.content_payload.pages} />
      </div>
    );
  }

  if (strategy === ViewerStrategy.Terminal) {
    return (
      <div className={styles.preview} data-testid="evidence-preview">
        <TerminalViewer evidence={terminal} pages={terminal.content_payload.pages} />
      </div>
    );
  }

  return (
    <div className={styles.preview} data-testid="evidence-preview">
      <p className={styles.notPaged}>
        {t(
          'pages.gameRoom.evidence.viewers.pagedStrategiesOnly',
          'The page preview applies to paper and terminal documents. This strategy stores a single file instead.'
        )}
      </p>
    </div>
  );
};

export default EvidencePreview;
