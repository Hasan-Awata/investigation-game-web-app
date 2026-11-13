import { useLayoutEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { notificationTiming } from './notificationTiming';
import styles from './PopupNotice.module.css';

export interface NotificationEntry { id: string; visible: boolean; content: ReactNode }
interface Props { entries: NotificationEntry[]; onPauseChange: (paused: boolean) => void }

export default function NotificationStack({ entries, onPauseChange }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const interaction = useRef({ hover: false, focus: false });
  const pause = (kind: 'hover' | 'focus', active: boolean) => {
    interaction.current[kind] = active;
    onPauseChange(interaction.current.hover || interaction.current.focus);
  };
  useLayoutEffect(() => {
    const elements = Array.from(root.current?.children ?? []) as HTMLElement[];
    const measure = () => {
      const next = Object.fromEntries(elements.map(el => [el.dataset.id!, el.getBoundingClientRect().height]));
      setHeights(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    measure();
    if (interaction.current.focus && !root.current?.contains(document.activeElement)) {
      interaction.current.focus = false;
      onPauseChange(interaction.current.hover);
    }
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [entries, onPauseChange]);

  let offset = 0;
  const offsets: Record<string, number> = {};
  for (const entry of [...entries].reverse()) {
    offsets[entry.id] = offset;
    if (entry.visible) offset += (heights[entry.id] ?? 0) + 12;
  }
  const timing = {
    '--notice-arrival': `${notificationTiming.arrival}ms`,
    '--notice-exit': `${notificationTiming.exit}ms`,
    '--notice-stack': `${notificationTiming.stack}ms`,
  } as CSSProperties;
  return createPortal(<div className={styles.stack} style={timing}
    onMouseEnter={() => pause('hover', true)} onMouseLeave={() => pause('hover', false)}
    onFocusCapture={() => pause('focus', true)}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) pause('focus', false); }}>
    <div ref={root} style={{ position: 'relative', height: Math.max(0, ...entries.map(entry => offsets[entry.id] + (heights[entry.id] ?? 0))) }}>
    {entries.map(entry => <div key={entry.id} data-id={entry.id} className={styles.position}
      style={{ transform: `translateY(-${offsets[entry.id]}px)` }}>
      <div className={styles.motion} data-visible={entry.visible} inert={!entry.visible} aria-hidden={!entry.visible || undefined}>{entry.content}</div>
    </div>)}
    </div>
  </div>, document.body);
}
