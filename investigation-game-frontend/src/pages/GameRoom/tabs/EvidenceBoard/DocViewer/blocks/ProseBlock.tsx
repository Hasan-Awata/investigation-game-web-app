import { useMemo } from 'react';
import { sanitizeHtml } from '@/utils/sanitize';
import type { DocBlock, ProseTone } from '@/types/evidence/doc';

type Props = { block: Extract<DocBlock, { type: 'prose' }> };

/**
 * Rich text. Author HTML is sanitized before render -- `sanitizeHtml` whitelists
 * the `class` attribute so `.redacted` and `.highlighted` spans survive
 * (src/utils/sanitize.ts:3-6, documented in AdminUI/index.tsx:70-80).
 *
 * Tones: `typed` (default), `handwritten` (MemoViewer), `mono` (dossier),
 * `serif` (JournalViewer).
 */
export default function ProseBlock({ block }: Props) {
  const { html, tone = 'typed' } = block.props;
  const clean = useMemo(() => (html ? sanitizeHtml(html) : ''), [html]);
  if (!clean) return null;

  const safeTone: ProseTone =
    tone === 'handwritten' || tone === 'mono' || tone === 'serif' ? tone : 'typed';

  return (
    <div
      className={`db-prose db-prose--${safeTone}`}
      style={block.style?.pad ? { padding: block.style.pad } : undefined}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
