import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import '@/i18n';
import type { MediaEvidence } from '@/types/evidence';
import MediaViewer from './MediaViewer';

vi.mock('./ViewersContainer', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const evidence: MediaEvidence = {
  id: 7,
  case_id: 1,
  title: 'Recovered photograph',
  evidence_type: 'image',
  img_url: '/photo.jpg',
  metadata: { url: '/fallback.jpg' },
  is_initial: false,
  is_vital_for_conviction: false,
};

describe('Evidence images', () => {
  it('uses the displayed image to measure loaded dimensions', () => {
    render(<MediaViewer evidence={evidence} />);
    const image = screen.getByAltText(evidence.title);
    expect(image).toHaveAttribute('src', 'http://localhost:8000/photo.jpg');
    expect(image.parentElement).toHaveAttribute('aria-busy', 'true');

    Object.defineProperties(image, {
      naturalWidth: { value: 720 },
      naturalHeight: { value: 960 },
    });
    fireEvent.load(image);
    expect(image.parentElement).toHaveStyle({ aspectRatio: '720 / 960' });
    expect(image.parentElement).toHaveAttribute('aria-busy', 'false');
  });

  it('ends loading on failure and starts fresh when the URL changes', () => {
    const { rerender } = render(<MediaViewer evidence={evidence} />);
    fireEvent.error(screen.getByAltText(evidence.title));
    expect(screen.getByRole('status')).toBeVisible();
    expect(screen.queryByAltText(evidence.title)).toBeNull();

    rerender(<MediaViewer evidence={{ ...evidence, img_url: undefined }} />);
    const image = screen.getByAltText(evidence.title);
    expect(image).toHaveAttribute('src', 'http://localhost:8000/fallback.jpg');
    expect(image.parentElement).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows the unavailable state when there is no source', () => {
    render(<MediaViewer evidence={{ ...evidence, img_url: undefined, metadata: null }} />);
    expect(screen.getByRole('status')).toBeVisible();
    expect(screen.queryByAltText(evidence.title)).toBeNull();
  });
});
