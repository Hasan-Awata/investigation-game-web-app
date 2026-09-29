import { useMemo } from 'react';
import { normalizeDoc } from '@/types/evidence/doc';
import ViewersContainer from '../Viewers/ViewersContainer';
import DocSheet from './DocSheet';

interface UniversalDocViewerProps {
  evidence: { id: number; metadata?: unknown };
  /** Overrides the stored document. Used by the admin authoring preview. */
  doc?: unknown;
}

/**
 * Single renderer for every paper artefact: letters, contracts, police reports,
 * bank ledgers, call logs, medical diagrams, court transcripts.
 *
 * The `document` / `forensic` split is gone -- there is one component, one block
 * model, and one code path. Zoom, pan, and fullscreen still come from
 * `ViewersContainer`, which is intentionally unchanged.
 *
 * This component is not wired into routing yet; Phase 2 replaces the
 * `DocumentViewer` / `ForensicViewer` dispatch. See PlansEvidence.md section 6.
 */
export default function UniversalDocViewer({ evidence, doc }: UniversalDocViewerProps) {
  const resolved = useMemo(() => normalizeDoc(doc ?? evidence.metadata), [doc, evidence.metadata]);

  return (
    <ViewersContainer evidence={evidence as { id: number; [key: string]: unknown }}>
      <DocSheet doc={resolved} evidenceId={evidence.id} />
    </ViewersContainer>
  );
}
