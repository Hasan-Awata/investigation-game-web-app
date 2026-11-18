import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DndContext } from '@dnd-kit/core';
import '@/i18n';
import type { Evidence } from '@/types/evidence';
import EvidenceCard, { EvidenceCardOverlay } from './EvidenceCard';

const evidence = {
  id: 7,
  case_id: 1,
  title: 'Terminal log',
  evidence_type: 'digital',
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

  it('renders the title of malformed digital evidence in the card and drag preview', () => {
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
