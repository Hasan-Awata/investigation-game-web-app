import type { DocBlock, ImageFilter } from '@/types/evidence/doc';
import { assetUrl } from '@/utils/assetUrl';

type Props = { block: Extract<DocBlock, { type: 'image' }> };

const DEFAULT_WIDTH: Record<ImageFilter, number> = {
  polaroid: 220,
  mugshot: 150,
  micrograph: 320,
  plain: 280,
};

/**
 * Embedded exhibit image. Distilled from the three genuine in-document image
 * treatments in the codebase:
 * - `polaroid`   taped print, per `.sticky-tape` (MemoViewer.css:149-161)
 * - `mugshot`    greyscale portrait, per `.bg-check-mugshot` (BackgroundCheckViewer.css:78-86)
 * - `micrograph` crosshair overlay, per `.microscope-comparison` (BallisticsViewer.tsx:79-89)
 * - `plain`      unframed
 *
 * URLs come from the admin block image upload endpoint and are stored directly
 * in props; see PlansEvidence.md section 3.5. They are resolved through
 * `assetUrl` because a bare `/assets/...` path would otherwise hit the Vite
 * origin rather than the backend that serves it.
 */
export default function ImageBlock({ block }: Props) {
  const { url, caption, width, rotate = 0, filter = 'plain' } = block.props;
  const src = assetUrl(url);
  if (!src) return null;

  const safeFilter: ImageFilter =
    filter === 'polaroid' || filter === 'mugshot' || filter === 'micrograph' ? filter : 'plain';

  const w = Number.isFinite(width) ? Math.min(720, Math.max(40, Number(width))) : DEFAULT_WIDTH[safeFilter];

  return (
    <figure
      className={`db-image db-image--${safeFilter}`}
      style={block.style?.pad ? { padding: block.style.pad } : undefined}
    >
      <div className="db-image-frame" style={{ width: w, transform: `rotate(${rotate}deg)` }}>
        {safeFilter === 'polaroid' && <div className="db-image-tape" aria-hidden="true" />}
        <img src={src} alt={caption || 'Exhibit photograph'} className="db-image-img" draggable={false} />
        {safeFilter === 'micrograph' && (
          <>
            <div className="db-image-crosshair-v" aria-hidden="true" />
            <div className="db-image-crosshair-h" aria-hidden="true" />
          </>
        )}
      </div>
      {caption && <figcaption className="db-image-caption">{caption}</figcaption>}
    </figure>
  );
}
