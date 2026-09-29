import type { DiagramPreset, DocRenderContext } from '@/types/evidence/doc';

/**
 * Whitelisted inline SVG diagrams.
 *
 * `body_outline` is lifted verbatim from
 * GameRoom/tabs/EvidenceBoard/Viewers/ForensicViewers/AutopsyViewer.tsx:70-87,
 * which is deleted in Phase 2. The others are concentric-arc whorl, DNA band
 * track, and mass-spec trace.
 *
 * Author-supplied SVG is deliberately NOT supported: sanitizeHtml's tag
 * whitelist (src/utils/sanitize.ts:4) strips <svg> entirely, so an inline SVG
 * could never survive the sanitize pass anyway.
 *
 * The two data presets are seeded from the evidence id rather than stored as
 * coordinates. That reproduces the legacy behaviour (DnaViewer.tsx:16-27,
 * TraceAnalysisViewer.tsx:18-27) -- a stable, unique-per-row chart with no
 * payload bloat in the stored document.
 */

interface DiagramShapeProps {
  preset: DiagramPreset;
  ctx?: DocRenderContext;
}

const BodyOutline = () => (
  <svg viewBox="0 0 100 220" className="db-diagram-svg" role="img" aria-hidden="true">
    <circle cx="50" cy="25" r="14" />
    <path d="M35 50 Q50 45 65 50 L60 110 L40 110 Z" />
    <path d="M30 55 Q20 80 15 110" />
    <path d="M70 55 Q80 80 85 110" />
    <path d="M42 115 L40 195" />
    <path d="M58 115 L60 195" />
    <line x1="0" y1="50" x2="100" y2="50" className="db-diagram-grid" />
    <line x1="0" y1="110" x2="100" y2="110" className="db-diagram-grid" />
    <line x1="50" y1="0" x2="50" y2="220" className="db-diagram-grid" />
  </svg>
);

const Fingerprint = () => (
  <svg viewBox="0 0 100 130" className="db-diagram-svg" role="img" aria-hidden="true">
    <g>
      <path d="M50 12 a38 38 0 0 1 0 76" />
      <path d="M50 20 a30 30 0 0 1 0 60" />
      <path d="M50 28 a22 22 0 0 1 0 44" />
      <path d="M50 36 a14 14 0 0 1 0 28" />
      <path d="M50 44 a6 6 0 0 1 0 12" />
    </g>
    <path d="M50 12 a38 38 0 0 0 0 76" className="db-diagram-grid" />
    <path d="M50 20 a30 30 0 0 0 0 60" className="db-diagram-grid" />
    <path d="M50 28 a22 22 0 0 0 0 44" className="db-diagram-grid" />
    <path d="M50 36 a14 14 0 0 0 0 28" className="db-diagram-grid" />
    <path d="M50 44 a6 6 0 0 0 0 12" className="db-diagram-grid" />
    <path d="M12 74 a38 38 0 0 0 76 0" className="db-diagram-grid" />
    <path d="M20 80 a30 30 0 0 0 60 0" className="db-diagram-grid" />
    <path d="M28 86 a22 22 0 0 0 44 0" className="db-diagram-grid" />
  </svg>
);

const BAND_COUNT = 24;

/**
 * Two stacked DNA band tracks, mirroring DnaViewer.tsx:62-79. The lower track
 * is offset by a second multiplier so a non-matching sample visibly disagrees
 * with the crime-scene sample above it.
 */
const Electropherogram = ({ seed }: { seed: number }) => {
  const track = (row: number, salt: number) => (
    <g transform={`translate(0, ${row * 34})`}>
      <rect x="0" y="0" width="100" height="28" fill="none" stroke="currentColor" strokeOpacity="0.25" />
      {Array.from({ length: BAND_COUNT }, (_, i) => {
        const opacity = ((seed * (i + 1) * salt) % 100) / 100;
        return (
          <line
            key={i}
            x1={2 + (i * 96) / BAND_COUNT}
            y1="3"
            x2={2 + (i * 96) / BAND_COUNT}
            y2="25"
            stroke="currentColor"
            strokeWidth={opacity > 0.5 ? 1.8 : 1}
            strokeOpacity={opacity * 0.85}
          />
        );
      })}
    </g>
  );

  return (
    <svg viewBox="0 0 100 62" className="db-diagram-svg db-diagram-svg--wide" role="img" aria-hidden="true">
      {track(0, 17)}
      {track(1, 23)}
    </svg>
  );
};

/** Mass-spec trace, ported from the point generator at TraceAnalysisViewer.tsx:18-27. */
const MassSpec = ({ seed }: { seed: number }) => {
  const peaks = (s: number) => {
    const points = ['0,100'];
    for (let i = 1; i <= 20; i += 1) {
      const x = i * 5;
      const major = (s * i) % 7 === 0;
      const y = major ? 10 + ((s * i) % 20) : 75 + ((s * i) % 20);
      points.push(`${x},${y}`);
    }
    points.push('100,100');
    return points.join(' ');
  };

  return (
    <svg
      viewBox="0 0 100 100"
      className="db-diagram-svg db-diagram-svg--wide"
      role="img"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <line x1="0" y1="25" x2="100" y2="25" className="db-diagram-grid" />
      <line x1="0" y1="50" x2="100" y2="50" className="db-diagram-grid" />
      <line x1="0" y1="75" x2="100" y2="75" className="db-diagram-grid" />
      <polyline points={peaks(seed)} className="db-trace-line db-trace-line--primary" />
      <polyline points={peaks(seed + 1)} className="db-trace-line db-trace-line--secondary" />
    </svg>
  );
};

/** Every preset takes the same props; static ones simply ignore `seed`. */
type PresetComponent = (props: { seed: number }) => React.JSX.Element;

const DIAGRAM_PRESETS: Record<DiagramPreset, PresetComponent> = {
  body_outline: () => <BodyOutline />,
  fingerprint: () => <Fingerprint />,
  electropherogram: Electropherogram,
  mass_spec: MassSpec,
};

export default function DiagramShape({ preset, ctx }: DiagramShapeProps) {
  const Component = DIAGRAM_PRESETS[preset] ?? DIAGRAM_PRESETS.body_outline;
  // `|| 1` keeps the degenerate seed 0 from collapsing every band to zero opacity.
  const seed = Math.abs(Math.trunc(ctx?.evidenceId ?? 0)) || 1;
  return <Component seed={seed} />;
}
