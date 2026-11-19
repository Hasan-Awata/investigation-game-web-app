export interface ViewerGeometry {
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
}
interface ViewerPosition { x: number; y: number }
export function fitScale(g: ViewerGeometry, fullscreen: boolean): number {
  if (Math.min(g.width, g.height, g.viewportWidth, g.viewportHeight) <= 0) return 1;
  return Math.min(1, g.viewportWidth / g.width, fullscreen ? g.viewportHeight / g.height : 1);
}
export function wheelZoom(zoom: number, delta: number, mode: number, viewportHeight: number): number {
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? viewportHeight : 1);
  return Math.min(5, Math.max(1, zoom - pixels * 0.005));
}
export function clampPan(position: ViewerPosition, g: ViewerGeometry, scale: number): ViewerPosition {
  const maxX = Math.max(0, (g.width * scale - g.viewportWidth) / 2);
  const maxY = Math.max(0, (g.height * scale - g.viewportHeight) / 2);
  return { x: Math.max(-maxX, Math.min(maxX, position.x)), y: Math.max(-maxY, Math.min(maxY, position.y)) };
}
