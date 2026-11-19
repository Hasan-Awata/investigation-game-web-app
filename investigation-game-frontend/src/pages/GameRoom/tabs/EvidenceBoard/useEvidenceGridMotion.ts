import { useLayoutEffect, useRef } from 'react';
import { useDndContext } from '@dnd-kit/core';
import type { Evidence } from '@/types';

interface GridLayout {
  width: number;
  columns: number;
  positions: Map<HTMLElement, { x: number; y: number }>;
}

export function useEvidenceGridMotion(evidences: readonly Evidence[]) {
  const gridRef = useRef<HTMLDivElement>(null);
  const previous = useRef<GridLayout | null>(null);
  const animations = useRef(new Map<HTMLElement, Animation>());
  const { active } = useDndContext();
  const dragging = Boolean(active);

  useLayoutEffect(() => {
    const running = animations.current;
    return () => {
      running.forEach(animation => animation.cancel());
      running.clear();
      previous.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid?.animate || !window.matchMedia) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const running = animations.current;
    const cards = Array.from(grid.children).filter((node): node is HTMLElement => node instanceof HTMLElement);

    const update = (resizing: boolean) => {
      const positions = new Map(cards.map(card => [card, { x: card.offsetLeft, y: card.offsetTop }]));
      const layout = {
        width: grid.clientWidth,
        columns: getComputedStyle(grid).gridTemplateColumns.split(' ').filter(track => Number.parseFloat(track) > 0).length,
        positions,
      };
      const lastLayout = previous.current;
      previous.current = layout;

      for (const [card, animation] of running) {
        if (dragging || reducedMotion.matches || !positions.has(card)) {
          animation.cancel();
          running.delete(card);
        }
      }
      if (!lastLayout || dragging || reducedMotion.matches) return;

      // Let the sidebar or viewport move the entire row continuously until the grid wraps.
      const reflowX = !resizing || lastLayout.width === layout.width || lastLayout.columns !== layout.columns;
      const shifts = Array.from(positions, ([card, point]) => {
        const old = lastLayout.positions.get(card);
        if (!old) return null;
        const x = reflowX ? old.x - point.x : 0;
        const y = old.y - point.y;
        if (x === 0 && y === 0) return null;

        const animation = running.get(card);
        const transform = animation ? getComputedStyle(card).transform : 'none';
        const matrix = transform === 'none' ? null : new DOMMatrixReadOnly(transform);
        return { card, animation, x: x + (matrix?.e ?? 0), y: y + (matrix?.f ?? 0) };
      });

      for (const shift of shifts) {
        if (!shift) continue;
        const { card, animation, x, y } = shift;
        animation?.cancel();
        const next = card.animate(
          [{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' }],
          { duration: 240, easing: 'ease-out' },
        );
        running.set(card, next);
        next.onfinish = () => {
          if (running.get(card) === next) running.delete(card);
        };
      }
    };

    update(false);
    const onResize = () => update(true);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize);
    observer?.observe(grid);
    cards.forEach(card => observer?.observe(card));
    reducedMotion.addEventListener('change', onResize);
    return () => {
      observer?.disconnect();
      reducedMotion.removeEventListener('change', onResize);
    };
  }, [evidences, dragging]);

  return gridRef;
}
