import { fireEvent, render, screen, act, within } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@/i18n';
import type { Evidence } from '@/types/evidence';
import EvidenceModal from './EvidenceModal';
import { useEvidenceContext } from './EvidenceContext';

vi.mock('./DocViewer/UniversalDocViewer', () => ({ default: function MockDocViewer() { const { isFullscreen } = useEvidenceContext(); return <div data-testid="paper">{String(isFullscreen)}</div>; } }));
vi.mock('./TerminalViewer/TerminalViewer', () => ({ default: () => <div>terminal viewer</div> }));
vi.mock('./Viewers/TestimonyViewer', () => ({ default: () => <div>testimony viewer</div> }));
vi.mock('./Viewers/MediaViewer', () => ({ default: () => <audio controls data-testid="media" /> }));
const evidence = { id: 1, title: 'Case report', evidence_type: 'document' } as Evidence;
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('Evidence modal', () => {
  it('opens a native modal, focuses close and restores the opener', () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();

    const { unmount } = render(<EvidenceModal evidence={evidence} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Case report' });
    expect(dialog).toBeInstanceOf(HTMLDialogElement);
    expect(dialog).toHaveAttribute('open');
    expect(document.body.style.overflow).toBe('hidden');
    expect(within(dialog).getByRole('button', { name: /close file|إغلاق/i })).toHaveFocus();

    unmount();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
    trigger.remove();
  });

  it('ignores a backdrop click after a press inside the dialog', () => {
    const onClose = vi.fn();
    render(<EvidenceModal evidence={evidence} onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.pointerDown(within(dialog).getByRole('heading'));
    fireEvent.click(dialog);
    expect(dialog).not.toHaveAttribute('data-closing');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('dismisses immediately with reduced motion', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    const onClose = vi.fn();
    render(<EvidenceModal evidence={evidence} onClose={onClose} />);
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(onClose).toHaveBeenCalledOnce();
  });
  it('preserves fullscreen context and resets it when changing evidence', () => {
    const { rerender } = render(<EvidenceModal evidence={evidence} onClose={vi.fn()} />);
    fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button')[0]); expect(screen.getByTestId('paper')).toHaveTextContent('true');
    rerender(<EvidenceModal evidence={{ ...evidence, id: 2 }} onClose={vi.fn()} />);
    expect(screen.getByTestId('paper')).toHaveTextContent('false');
  });
  it.each(['escape', 'backdrop', 'close'])('dismisses by %s after the exit fade', method => {
    vi.useFakeTimers(); const onClose = vi.fn(); render(<EvidenceModal evidence={evidence} onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    if (method === 'escape') fireEvent(dialog, new Event('cancel', { cancelable: true }));
    else if (method === 'backdrop') {
      fireEvent.pointerDown(dialog, { button: 0 });
      fireEvent.click(dialog);
    }
    else fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button')[1]);
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAttribute('data-closing');
    expect(onClose).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(160));
    expect(onClose).toHaveBeenCalledOnce();
  });
  it.each(['document', 'forensic', 'digital', 'testimony', 'image'])('renders %s evidence', type => {
    render(<EvidenceModal evidence={{ ...evidence, evidence_type: type } as Evidence} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    if (type === 'document' || type === 'forensic') expect(screen.getByTestId('paper')).toBeInTheDocument();
    else if (type === 'digital') expect(screen.getByText('terminal viewer')).toBeInTheDocument();
    else if (type === 'testimony') expect(screen.getByText('testimony viewer')).toBeInTheDocument();
    else expect(screen.getByTestId('media')).toBeInTheDocument();
  });

  it.each(['button', 'escape'])('opens the cassette dialog and closes it by %s', method => {
    const onClose = vi.fn();
    const recording = { ...evidence, title: 'Emergency call', evidence_type: 'audio', audio_url: '/emergency.wav' } as Evidence;
    const { unmount } = render(<EvidenceModal evidence={recording} onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: 'Emergency call' });
    expect(dialog.tagName).toBe('DIALOG');
    expect(dialog.querySelector('audio')).toHaveAttribute('src', 'http://localhost:8000/emergency.wav');
    expect(within(dialog).getByRole('button', { name: 'Play Emergency call' })).toBeInTheDocument();
    expect(within(dialog).queryByText(/EX-001|200769/)).toBeNull();
    expect(within(dialog).queryByRole('button', { name: /fullscreen|ملء الشاشة/i })).toBeNull();
    if (method === 'escape') fireEvent(dialog, new Event('cancel', { cancelable: true }));
    else fireEvent.click(within(dialog).getByRole('button', { name: /close file|إغلاق/i }));
    expect(onClose).toHaveBeenCalledOnce();
    unmount();
  });
});
