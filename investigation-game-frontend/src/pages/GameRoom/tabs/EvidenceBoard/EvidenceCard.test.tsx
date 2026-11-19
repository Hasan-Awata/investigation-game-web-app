import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DndContext } from '@dnd-kit/core';
import '@/i18n';
import { DEFAULT_DOC, type Evidence } from '@/types/evidence';
import EvidenceCard, { EvidenceCardOverlay } from './EvidenceCard';

const evidence = {
  id: 7,
  case_id: 1,
  title: 'Witness statement',
  evidence_type: 'testimony',
  is_initial: false,
  is_vital_for_conviction: false,
  metadata: {},
} as Evidence;

describe('Evidence cards', () => {
  it.each(['Enter', ' '])('opens non-audio evidence with %j', key => {
    const onInspect = vi.fn();
    render(<DndContext><EvidenceCard evidence={evidence} isNew onInspect={onInspect} /></DndContext>);
    const card = screen.getByRole('button', { name: evidence.title });
    expect(card).toHaveAttribute('data-unread');
    fireEvent.keyDown(card, { key });
    fireEvent.keyDown(card, { key, repeat: true });
    expect(onInspect).toHaveBeenCalledExactlyOnceWith(evidence);
  });

  it('drags a document folder and opens the viewer with one activation', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const documentEvidence: Evidence = {
      ...evidence,
      evidence_type: 'document',
      title: 'Chain of custody',
      description: 'Collected at the scene',
      metadata: {
        doc: {
          ...DEFAULT_DOC,
          blocks: [{ id: 'title', type: 'letterhead', span: 12, props: { title: 'Evidence inventory' } }],
        },
      },
    };
    const onInspect = vi.fn();
    const onDragStart = vi.fn();
    render(
      <DndContext onDragStart={onDragStart}>
        <EvidenceCard evidence={documentEvidence} isNew onInspect={onInspect} />
      </DndContext>,
    );

    const folder = screen.getByRole('button', { name: documentEvidence.title });
    const cover = within(folder).getByText('Collected at the scene');
    const preview = within(folder).getByText('Evidence inventory');
    expect(folder.querySelector('.folder-root')).not.toHaveAttribute('data-draggable');
    expect(screen.getAllByRole('button')).toHaveLength(1);

    fireEvent.click(cover);
    expect(onInspect).toHaveBeenCalledExactlyOnceWith(documentEvidence);
    onInspect.mockClear();
    fireEvent.click(preview);
    expect(onInspect).toHaveBeenCalledExactlyOnceWith(documentEvidence);
    onInspect.mockClear();
    fireEvent.keyDown(folder, { key: 'Enter' });
    expect(onInspect).toHaveBeenCalledExactlyOnceWith(documentEvidence);

    fireEvent.pointerDown(cover, { isPrimary: true, button: 0 });
    expect(onDragStart).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      active: expect.objectContaining({ id: documentEvidence.id }),
    }));
    fireEvent.pointerUp(cover);
  });

  it('keeps the folder usable when a saved document block fails to render', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const reportError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const documentEvidence = {
      ...evidence,
      evidence_type: 'document',
      title: 'Legacy document',
      metadata: {
        doc: { ...DEFAULT_DOC, blocks: [{ id: 'table', type: 'table', span: 12, props: { columns: [null], rows: [{}] } }] },
      },
    } as unknown as Evidence;
    const onInspect = vi.fn();
    render(<DndContext><EvidenceCard evidence={documentEvidence} isNew={false} onInspect={onInspect} /></DndContext>);
    expect(reportError).toHaveBeenCalledWith('System Exception Caught by Boundary:', expect.any(Error), expect.anything());
    fireEvent.keyDown(screen.getByRole('button', { name: documentEvidence.title }), { key: 'Enter' });
    expect(onInspect).toHaveBeenCalledExactlyOnceWith(documentEvidence);
  });

  it('renders the title of a testimony in the card and drag preview', () => {
    const { container } = render(
      <DndContext>
        <EvidenceCard evidence={evidence} isNew={false} onInspect={vi.fn()} />
        <EvidenceCardOverlay evidence={evidence} />
      </DndContext>,
    );
    const card = screen.getByRole('button', { name: evidence.title });
    const overlay = container.querySelector<HTMLElement>('[inert][aria-hidden="true"]');
    expect(within(card).getByText(evidence.title)).toBeVisible();
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveTextContent(evidence.title);
  });
});
