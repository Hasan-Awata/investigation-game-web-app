import { useLayoutEffect, useRef } from 'react';

const xProperty = '--room-highlight-x';
const widthProperty = '--room-highlight-width';
const startProperty = '--room-highlight-start';
const endProperty = '--room-highlight-end';

export function useRoomTabIndicator(activeTab: string) {
  const rowRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const previousTab = useRef<string | null>(null);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    return () => {
      animationRef.current?.cancel();
      animationRef.current = null;
      delete row.dataset.sharedHighlight;
      previousTab.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row || !window.CSS?.registerProperty || !row.animate || !window.matchMedia) return;

    const buttons = Array.from(row.querySelectorAll<HTMLButtonElement>('button[data-room-tab]'));
    const selectedIndex = buttons.findIndex(button => button.dataset.roomTab === activeTab);
    if (selectedIndex < 0) return;
    const targetStart = Number(selectedIndex === 0);
    const targetEnd = Number(selectedIndex === buttons.length - 1);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let targetKey = '';
    const update = (move: boolean) => {
      const rowBounds = row.getBoundingClientRect();
      const bounds = buttons.map(button => {
        const rect = button.getBoundingClientRect();
        const x = rect.left - rowBounds.left - row.clientLeft + row.scrollLeft;
        const y = rect.top - rowBounds.top - row.clientTop + row.scrollTop;
        button.style.setProperty('--room-tab-x', `${x}px`);
        button.style.setProperty('--room-tab-y', `${y}px`);
        return { x, y, width: rect.width, height: rect.height };
      });
      const target = bounds[selectedIndex];
      const key = JSON.stringify(target);
      if (key === targetKey && !reducedMotion.matches) return;
      targetKey = key;

      const computed = getComputedStyle(row);
      const fromX = parseFloat(computed.getPropertyValue(xProperty));
      const fromWidth = parseFloat(computed.getPropertyValue(widthProperty));
      const fromStart = Number(computed.getPropertyValue(startProperty));
      const fromEnd = Number(computed.getPropertyValue(endProperty));
      const canMove = move && row.dataset.sharedHighlight && !reducedMotion.matches &&
        Number.isFinite(fromX) && fromWidth > 0;
      animationRef.current?.cancel();
      animationRef.current = null;
      if (target.width <= 0 || target.height <= 0) {
        delete row.dataset.sharedHighlight;
        return;
      }

      const frame = (x: number, width: number, start: number, end: number) => ({
        [xProperty]: `${x}px`,
        [widthProperty]: `${width}px`,
        [startProperty]: String(start),
        [endProperty]: String(end),
      });
      const targetFrame = frame(target.x, target.width, targetStart, targetEnd);
      Object.entries(targetFrame).forEach(([property, value]) => row.style.setProperty(property, value));
      row.style.setProperty('--room-highlight-y', `${target.y}px`);
      row.style.setProperty('--room-highlight-height', `${target.height}px`);
      row.dataset.sharedHighlight = 'true';
      if (!canMove || (fromX === target.x && fromWidth === target.width)) return;

      const left = Math.min(...bounds.map(rect => rect.x));
      const right = Math.max(...bounds.map(rect => rect.x + rect.width));
      const center = ((fromX + fromWidth / 2) + (target.x + target.width / 2)) / 2;
      const width = Math.min((fromWidth + target.width) / 2 * 1.12, 2 * (center - left), 2 * (right - center));
      animationRef.current = row.animate(
        [frame(fromX, fromWidth, fromStart, fromEnd), frame(center - width / 2, width, 0, 0), targetFrame],
        { duration: 240, easing: 'ease-in-out' },
      );
    };

    update(previousTab.current !== null && previousTab.current !== activeTab);
    previousTab.current = activeTab;
    const realign = () => update(false);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(realign);
    observer?.observe(row);
    buttons.forEach(button => observer?.observe(button));
    reducedMotion.addEventListener('change', realign);
    return () => {
      observer?.disconnect();
      reducedMotion.removeEventListener('change', realign);
    };
  }, [activeTab]);

  return rowRef;
}
