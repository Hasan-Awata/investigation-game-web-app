import { useLayoutEffect, useRef } from 'react';
import { clampPan, fitScale, wheelZoom } from './viewerGeometry';
import type { ViewerGeometry } from './viewerGeometry';

const INTERACTIVE = 'audio, video, button, a, input, select, textarea, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="slider"]';

export function useViewerInteraction(fullscreen: boolean, pageIndex?: number) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    const stage = stageRef.current;
    const child = content?.firstElementChild;
    if (!viewport || !content || !stage || !(child instanceof HTMLElement)) return;

    if (fullscreen) {
      // Hidden overflow retains native scroll offsets from standard reading mode.
      viewport.scrollTop = 0;
      viewport.scrollLeft = 0;
    }

    let geometry: ViewerGeometry = { width: 0, height: 0, viewportWidth: 0, viewportHeight: 0 };
    let scale = 1;
    let zoom = 1;
    let position = { x: 0, y: 0 };
    let drag: { id: number; x: number; y: number } | null = null;
    let frame: number | null = null;
    let idle: ReturnType<typeof setTimeout> | null = null;
    let needsMeasurement = true;

    const draw = () => {
      frame = null;
      if (needsMeasurement) {
        needsMeasurement = false;
        const viewportWidth = viewport.clientWidth;
        const viewportHeight = viewport.clientHeight;
        // Fluid media must reflow against the new viewport before measuring.
        if (viewportWidth !== geometry.viewportWidth) content.style.width = '100%';
        const next = { width: child.offsetWidth, height: child.offsetHeight, viewportWidth, viewportHeight };
        if (Math.min(next.width, next.height, viewportWidth, viewportHeight) <= 0) return;
        const changed = next.width !== geometry.width || next.height !== geometry.height
          || viewportWidth !== geometry.viewportWidth || viewportHeight !== geometry.viewportHeight;
        if (changed) {
          geometry = next;
          scale = fitScale(geometry, fullscreen);
          content.style.width = `${geometry.width}px`;
          stage.style.height = fullscreen ? '' : `${geometry.height * scale}px`;
        }
      }
      position = zoom === 1 ? { x: 0, y: 0 } : clampPan(position, geometry, scale * zoom);
      content.style.transform = fullscreen
        ? `translate(${position.x}px, ${position.y}px) scale(${scale * zoom})`
        : `scale(${scale})`;
      viewport.style.cursor = !fullscreen ? 'auto' : drag ? 'grabbing' : zoom > 1 ? 'grab' : 'auto';
    };
    const schedule = () => { if (frame === null) frame = requestAnimationFrame(draw); };
    const coolDown = () => {
      if (idle !== null) clearTimeout(idle);
      idle = setTimeout(() => { idle = null; if (!drag) content.style.willChange = ''; }, 150);
    };
    const warmUp = () => { content.style.willChange = 'transform'; coolDown(); };
    const interactive = (target: EventTarget | null) => target instanceof Element && !!target.closest(INTERACTIVE);
    const wheel = (event: WheelEvent) => {
      if (interactive(event.target) || !geometry.width) return;
      event.preventDefault();
      zoom = wheelZoom(zoom, event.deltaY, event.deltaMode, geometry.viewportHeight);
      position = zoom === 1 ? { x: 0, y: 0 } : clampPan(position, geometry, scale * zoom);
      warmUp(); schedule();
    };
    const finishDrag = () => {
      const id = drag?.id;
      drag = null;
      if (id !== undefined && viewport.hasPointerCapture?.(id)) viewport.releasePointerCapture(id);
      coolDown(); schedule();
    };
    const down = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || zoom <= 1 || interactive(event.target)) return;
      event.preventDefault();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      viewport.setPointerCapture(event.pointerId);
      warmUp(); schedule();
    };
    const move = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;
      position = clampPan({ x: position.x + event.clientX - drag.x, y: position.y + event.clientY - drag.y }, geometry, scale * zoom);
      drag.x = event.clientX; drag.y = event.clientY;
      warmUp(); schedule();
    };
    const end = (event: PointerEvent) => { if (drag?.id === event.pointerId) finishDrag(); };
    const observer = new ResizeObserver(() => { needsMeasurement = true; schedule(); });
    observer.observe(child);
    observer.observe(viewport);
    draw();
    if (fullscreen) {
      viewport.addEventListener('wheel', wheel, { passive: false });
      viewport.addEventListener('pointerdown', down);
      viewport.addEventListener('pointermove', move);
      viewport.addEventListener('pointerup', end);
      viewport.addEventListener('pointercancel', end);
      viewport.addEventListener('lostpointercapture', end);
      window.addEventListener('blur', finishDrag);
    }
    return () => {
      observer.disconnect();
      viewport.removeEventListener('wheel', wheel);
      viewport.removeEventListener('pointerdown', down);
      viewport.removeEventListener('pointermove', move);
      viewport.removeEventListener('pointerup', end);
      viewport.removeEventListener('pointercancel', end);
      viewport.removeEventListener('lostpointercapture', end);
      window.removeEventListener('blur', finishDrag);
      if (drag && viewport.hasPointerCapture?.(drag.id)) viewport.releasePointerCapture(drag.id);
      if (frame !== null) cancelAnimationFrame(frame);
      if (idle !== null) clearTimeout(idle);
      content.style.willChange = '';
      content.style.width = '';
      content.style.transform = '';
      viewport.style.cursor = '';
      stage.style.height = '';
    };
  }, [fullscreen, pageIndex]);

  return { viewportRef, contentRef, stageRef };
}
