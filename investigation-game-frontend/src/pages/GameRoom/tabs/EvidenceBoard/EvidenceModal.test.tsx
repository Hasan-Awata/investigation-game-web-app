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
afterEach(() => vi.useRealTimers());
describe('Evidence modal', () => {
  it('focuses the dialog, contains keyboard navigation and restores focus', () => {
    const trigger = document.createElement('button'); document.body.append(trigger); trigger.focus();
    const { unmount } = render(<EvidenceModal evidence={evidence} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Case report' });
    expect(dialog).toHaveFocus(); expect(document.body.style.overflow).toBe('hidden');
    const buttons = within(screen.getByRole('dialog')).getAllByRole('button');
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true }); expect(buttons[1]).toHaveFocus();
    fireEvent.keyDown(buttons[1], { key: 'Tab' }); expect(buttons[0]).toHaveFocus();
    unmount(); expect(trigger).toHaveFocus(); expect(document.body.style.overflow).toBe(''); trigger.remove();
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
    if (method === 'escape') fireEvent.keyDown(dialog, { key: 'Escape' });
    else if (method === 'backdrop') fireEvent.click(dialog.parentElement!);
    else fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button')[1]);
    expect(onClose).not.toHaveBeenCalled(); act(() => vi.advanceTimersByTime(160)); expect(onClose).toHaveBeenCalledTimes(1);
  });
  it.each(['document', 'forensic', 'digital', 'testimony', 'image', 'audio'])('renders %s evidence', type => {
    render(<EvidenceModal evidence={{ ...evidence, evidence_type: type } as Evidence} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    if (type === 'document' || type === 'forensic') expect(screen.getByTestId('paper')).toBeInTheDocument();
    else if (type === 'digital') expect(screen.getByText('terminal viewer')).toBeInTheDocument();
    else if (type === 'testimony') expect(screen.getByText('testimony viewer')).toBeInTheDocument();
    else expect(screen.getByTestId('media')).toBeInTheDocument();
  });
});
