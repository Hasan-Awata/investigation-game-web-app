import type { Evidence } from '@/types';
import { DOC_THEME_SKINS, normalizeDoc } from '@/types/evidence/doc';
import './DocEvidence.css';

/**
 * Board card for every block-backed artefact.
 *
 * Replaces the seven `DocumentEvidenceVariants` and five
 * `ForensicEvidenceVariants`: card appearance is now derived from the
 * document's THEME, 1:1 via `DOC_THEME_SKINS`, so a document always looks the
 * same on the board and when opened. The theme is read through `normalizeDoc`
 * so a card can never throw on a malformed `metadata.doc` -- worst case it
 * falls back to the `case_file` skin.
 */
export default function DocEvidence({ evidence }: { evidence: Evidence }) {
  const { theme, blocks } = normalizeDoc(evidence.metadata);
  const skin = DOC_THEME_SKINS[theme];

  return (
    <div className={`doc-variant doc-variant--${skin}`} data-theme={theme}>
      <div className="doc-variant-tab" aria-hidden="true" />

      <h4 className="evidence-title">{evidence.title}</h4>
      {evidence.description && <p className="evidence-desc">{evidence.description}</p>}

      <div className="doc-variant-foot">
        <span className="doc-variant-skin">{theme.replace('_', ' ')}</span>
        <span className="doc-variant-blocks">
          {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'}
        </span>
      </div>
    </div>
  );
}
