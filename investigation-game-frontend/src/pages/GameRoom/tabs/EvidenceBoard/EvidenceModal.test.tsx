import { fireEvent, render, screen, act, within } from '@testing-library/react';
import { useLayoutEffect, type ComponentProps } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@/i18n';
import type { Evidence } from '@/types/evidence';
import EvidenceModal from './EvidenceModal';
import type UniversalDocViewer from './DocViewer/UniversalDocViewer';
import { useEvidenceContext } from './EvidenceContext';

vi.mock('./DocViewer/UniversalDocViewer', () => ({
  default: function MockDocViewer({ evidence, pageSelection }: ComponentProps<typeof UniversalDocViewer>) {
    const { isFullscreen } = useEvidenceContext();
    const { index, onPageCountChange } = pageSelection;
    useLayoutEffect(() => { onPageCountChange(evidence.metadata ? 3 : 1); }, [evidence.metadata, onPageCountChange]);
    return <div data-testid="paper" data-page-index={index}>{String(isFullscreen)}</div>;
  },
}));
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

  it('paginates only in fullscreen and restores the stacked view on exit', () => {
    const document: Evidence = {
      id: 1, case_id: 1, title: 'Paged report', is_initial: false, is_vital_for_conviction: false,
      evidence_type: 'document', metadata: { template: { id: 'background_check', version: 2, values: {} } },
    };
    const { rerender } = render(<EvidenceModal evidence={document} onClose={vi.fn()} />);
    const paper = screen.getByTestId('paper');
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(paper).not.toHaveAttribute('data-page-index');
    fireEvent.click(screen.getByRole('button', { name: /^fullscreen$|^ملء الشاشة$/i }));
    const navigation = screen.getByRole('navigation');
    expect(navigation.closest('header')).toBeInTheDocument();
    expect(navigation).toHaveAttribute('dir', 'ltr');
    const previous = within(navigation).getByRole('button', { name: /previous page|الصفحة السابقة/i });
    const next = within(navigation).getByRole('button', { name: /next page|الصفحة التالية/i });

    expect(previous).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(previous);
    expect(paper).toHaveAttribute('data-page-index', '0');
    fireEvent.click(next);
    expect(paper).toHaveAttribute('data-page-index', '1');
    expect(within(navigation).getByRole('status')).toHaveTextContent(/Page 2 of 3|الصفحة [2٢] من [3٣]/i);
    fireEvent.click(next);
    expect(next).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(next);
    expect(paper).toHaveAttribute('data-page-index', '2');
    fireEvent.click(previous);
    expect(paper).toHaveAttribute('data-page-index', '1');

    fireEvent.click(screen.getByRole('button', { name: /exit fullscreen|تصغير/i }));
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(paper).not.toHaveAttribute('data-page-index');
    rerender(<EvidenceModal evidence={{ ...document, id: 2 }} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^fullscreen$|^ملء الشاشة$/i }));
    expect(screen.getByTestId('paper')).toHaveAttribute('data-page-index', '0');
    rerender(<EvidenceModal evidence={{ ...evidence, id: 3 }} onClose={vi.fn()} />);
    expect(screen.queryByRole('navigation')).toBeNull();
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
  it.each(['document', 'forensic', 'testimony', 'image'])('renders %s evidence', type => {
    render(<EvidenceModal evidence={{ ...evidence, evidence_type: type } as Evidence} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    if (type === 'document' || type === 'forensic') expect(screen.getByTestId('paper')).toBeInTheDocument();
    else if (type === 'testimony') expect(screen.getByText('testimony viewer')).toBeInTheDocument();
    else expect(screen.getByTestId('media')).toBeInTheDocument();
  });

  it.each(['button', 'escape'])('opens the cassette dialog and fades out when closed by %s', method => {
    vi.useFakeTimers();
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
    expect(dialog).toHaveAttribute('data-closing');
    expect(onClose).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(160));
    expect(onClose).toHaveBeenCalledOnce();
    unmount();
  });
});
