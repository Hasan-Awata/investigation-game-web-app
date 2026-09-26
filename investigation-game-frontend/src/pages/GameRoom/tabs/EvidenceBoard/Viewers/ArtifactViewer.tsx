import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { FC } from 'react';
import type { ArtifactEvidenceDetail, HtmlArtifactPayload } from '@/types/evidence';
import ViewersContainer from './ViewersContainer';
import styles from './ArtifactViewer.module.css';

export interface ArtifactViewerProps {
  evidence: ArtifactEvidenceDetail;
}

/**
 * Renders a custom artifact.
 *
 * The document is author-supplied HTML, so it is mounted in a sandboxed iframe
 * with no `allow-same-origin`. That is the load-bearing part: with same-origin
 * the frame could reach this page's cookies and localStorage, which is the
 * player's session. `allow-scripts` stays on because an artifact is allowed to
 * script itself, just not to touch the host document.
 */
const ArtifactViewer: FC<ArtifactViewerProps> = ({ evidence }) => {
  const { t } = useTranslation();

  const srcDoc = useMemo(() => buildArtifactDocument(evidence.content_payload), [evidence.content_payload]);

  if (srcDoc === null) {
    return (
      <ViewersContainer>
        <div className={styles.empty}>
          {t('pages.gameRoom.evidence.viewers.artifact.empty', 'This artifact has no content yet.')}
        </div>
      </ViewersContainer>
    );
  }

  return (
    <ViewersContainer>
      <div className={styles.wrapper}>
        <iframe
          className={styles.frame}
          title={evidence.title}
          srcDoc={srcDoc}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
        />
      </div>
    </ViewersContainer>
  );
};

/**
 * Composes the artifact into a standalone document.
 *
 * The server already ran the markup and the stylesheet through its sanitizer
 * with a reject-don't-rewrite CSS policy, so anything that arrived here has
 * been checked. The iframe boundary is what makes that check meaningful at
 * runtime.
 */
function buildArtifactDocument(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  const candidate = payload as Partial<HtmlArtifactPayload>;

  if (candidate.kind !== 'html' || typeof candidate.html !== 'string' || candidate.html.trim() === '') {
    return null;
  }

  const css = typeof candidate.css === 'string' ? candidate.css : '';

  return [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    // The artifact stylesheet is injected into its own document rather than
    // adopted into this page, so it cannot reach the surrounding UI.
    `<style>${css}</style>`,
    '</head>',
    '<body>',
    candidate.html,
    '</body>',
    '</html>',
  ].join('');
}

export default ArtifactViewer;
