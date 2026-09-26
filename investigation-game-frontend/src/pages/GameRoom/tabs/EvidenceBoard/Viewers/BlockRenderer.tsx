import type { ReactNode } from 'react';
import { EvidenceBlockType, type EvidenceBlock } from '@/types/evidence';
import {
  DataGrid,
  SignaturePad,
  StampOverlay,
  TextParagraph,
  type SignaturePathLookup,
} from '../Widgets';

/**
 * Renders one stored block.
 *
 * This replaces a `Record<EvidenceBlockType, ElementType>` registry. `ElementType`
 * accepts any props at all, so the registry erased exactly the prop types the
 * widgets already declare, and the viewer could spread a block's props into an
 * arbitrary component with nothing checked. Switching on the discriminant keeps
 * each branch's props matched to the widget that consumes them, and the `never`
 * arm fails the build if the backend adds a block type that has no renderer
 * rather than rendering nothing at runtime.
 */
export interface BlockRendererProps {
  block: EvidenceBlock;
  /**
   * Id to public path, from the catalog the server sent with the document.
   * Kept in one stable object so it is not rebuilt per block.
   */
  signaturePaths: Record<string, string>;
}

export function renderBlock({ block, signaturePaths }: BlockRendererProps): ReactNode {
  const resolvePath: SignaturePathLookup = (signatureId) => signaturePaths[String(signatureId)];

  switch (block.type) {
    case EvidenceBlockType.Text:
      return <TextParagraph {...block.props} />;

    case EvidenceBlockType.Table:
      return <DataGrid {...block.props} />;

    case EvidenceBlockType.Signature:
      return <SignaturePad {...block.props} resolvePath={resolvePath} />;

    case EvidenceBlockType.Stamp:
      return <StampOverlay {...block.props} />;

    default: {
      // Exhaustive: adding a block type to the catalog without a renderer is a
      // compile error here, which is the point of not using a loose registry.
      const unhandled: never = block;
      return unhandled;
    }
  }
}
