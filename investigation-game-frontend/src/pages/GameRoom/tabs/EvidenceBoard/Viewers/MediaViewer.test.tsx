import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import '@/i18n';
import type { Evidence } from '@/types/evidence';
import MediaViewer from './MediaViewer';

vi.mock('./ViewersContainer', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

function renderAudio(audioUrl: string, imgUrl?: string) {
  const evidence = {
    id: 7,
    case_id: 1,
    title: 'Recording',
    evidence_type: 'audio',
    audio_url: audioUrl,
    img_url: imgUrl,
    is_initial: false,
    is_vital_for_conviction: false,
    metadata: { url: '/fallback.mp3' },
  } as Evidence;

  return render(<MediaViewer evidence={evidence as Extract<Evidence, { evidence_type: 'audio' }>} />);
}

describe('MediaViewer audio sources', () => {
  it.each([
    ['/recording.mp3', 'audio/mpeg'],
    ['/recording.wav?download=1', 'audio/wav'],
    ['/recording.ogg#track', 'audio/ogg'],
  ])('sets the native MIME type for %s', (url, mimeType) => {
    renderAudio(url);
    expect(screen.getByText('Recording').closest('div')?.parentElement?.querySelector('source'))
      .toHaveAttribute('type', mimeType);
  });

  it('omits a MIME type for unknown extensions and prefers audio_url', () => {
    renderAudio('/recording.flac', '/fallback.wav');
    const source = screen.getByText('Recording').closest('div')?.parentElement?.querySelector('source');
    expect(source).toHaveAttribute('src', 'http://localhost:8000/recording.flac');
    expect(source).not.toHaveAttribute('type');
  });

  it('falls back to image and metadata URLs when audio_url is absent', () => {
    const { rerender } = renderAudio('', '/fallback.wav');
    const evidence = {
      id: 7,
      title: 'Recording',
      evidence_type: 'audio',
      img_url: '/fallback.wav',
      metadata: { url: '/metadata.ogg' },
    } as unknown as Extract<Evidence, { evidence_type: 'audio' }>;
    rerender(<MediaViewer evidence={evidence} />);
    expect(document.querySelector('audio source')).toHaveAttribute('src', 'http://localhost:8000/fallback.wav');
  });
});
