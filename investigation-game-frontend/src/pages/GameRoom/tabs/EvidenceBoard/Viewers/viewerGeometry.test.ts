import { describe, expect, it } from 'vitest';
import { clampPan, fitScale, wheelZoom } from './viewerGeometry';
const g = { width: 800, height: 2400, viewportWidth: 400, viewportHeight: 600 };
describe('viewer geometry', () => {
  it('fits width in standard mode and both axes in fullscreen', () => {
    expect(fitScale(g, false)).toBe(0.5); expect(fitScale(g, true)).toBe(0.25);
    expect(fitScale({ ...g, viewportWidth: 0 }, true)).toBe(1);
  });
  it('normalizes wheel units and bounds zoom', () => {
    expect(wheelZoom(1, -16, 0, 600)).toBe(wheelZoom(1, -1, 1, 600));
    expect(wheelZoom(1, -600, 0, 600)).toBe(wheelZoom(1, -1, 2, 600));
    expect(wheelZoom(1, 10000, 0, 600)).toBe(1); expect(wheelZoom(1, -10000, 0, 600)).toBe(5);
  });
  it('clamps both directions and recenters a fitting sheet', () => {
    expect(clampPan({ x: 900, y: -9000 }, g, 1)).toEqual({ x: 200, y: -900 });
    expect(clampPan({ x: 900, y: -9000 }, g, 0.25)).toEqual({ x: 0, y: -0 });
  });
});
