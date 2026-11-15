import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import type { MediaEvidence } from '@/types';
import ImageEvidence from './ImageEvidence';
import styles from './ImageEvidence.module.css';

const observers: { callback: IntersectionObserverCallback; disconnect: ReturnType<typeof vi.fn> }[] = [];
const evidence = (url: string): MediaEvidence => ({
  id: 1, case_id: 1, title: 'Photo', evidence_type: 'image',
  img_url: url, is_initial: true, is_vital_for_conviction: false,
});
function intersect() {
  act(() => observers.at(-1)!.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
}
const skeleton = () => document.querySelector(`.${styles['image-skeleton-loader']}`);

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal('IntersectionObserver', class {
    disconnect = vi.fn();
    observe = vi.fn();
    constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit) {
      expect(options.rootMargin).toBe('200px');
      observers.push({ callback, disconnect: this.disconnect });
    }
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('ImageEvidence preview loading', () => {
  it.each(['load', 'error'] as const)('preserves the frame on %s and resets when the URL changes', event => {
    const { rerender, unmount } = render(<ImageEvidence evidence={evidence('/old.jpg')} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    const frame = document.querySelector(`.${styles['photo-frame']}`);
    intersect();
    expect(skeleton()).toBeInTheDocument();
    fireEvent[event](screen.getByRole('img'));
    expect(skeleton()).not.toBeInTheDocument();
    expect(document.querySelector(`.${styles['photo-frame']}`)).toBe(frame);
    expect(frame).not.toHaveAttribute('style');
    if (event === 'load') expect(screen.getByRole('img')).toHaveStyle({ opacity: 1 });
    else expect(document.querySelector(`.${styles['photo-placeholder']}`)).toBeInTheDocument();
    rerender(<ImageEvidence evidence={evidence('/new.jpg')} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    intersect();
    expect(skeleton()).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveStyle({ opacity: 0 });
    unmount();
    expect(observers.every(observer => observer.disconnect.mock.calls.length > 0)).toBe(true);
    render(<ImageEvidence evidence={evidence('/new.jpg')} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    intersect();
    expect(skeleton()).toBeInTheDocument();
  });

  it('shows a missing URL placeholder without observing', () => {
    render(<ImageEvidence evidence={evidence('')} />);
    expect(observers).toHaveLength(0);
    expect(document.querySelector(`.${styles['photo-placeholder']}`)).toBeInTheDocument();
  });

  it('uses metadata as fallback and prefers img_url', () => {
    const item = { ...evidence(''), metadata: { url: '/metadata.jpg' } };
    const { rerender } = render(<ImageEvidence evidence={item} />);
    intersect();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'http://localhost:8000/metadata.jpg');
    rerender(<ImageEvidence evidence={{ ...item, img_url: '/preferred.jpg' }} />);
    intersect();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'http://localhost:8000/preferred.jpg');
  });
});

