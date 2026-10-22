import { fireEvent, render, screen } from '@testing-library/react';
import { vi, describe, expect, it } from 'vitest';
import '@/i18n';
import type { Evidence } from '@/types';
import EvidenceCard from './EvidenceCard';

vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({ attributes: {}, listeners: {}, setNodeRef: vi.fn(), isDragging: false }),
}));

describe('EvidenceCard', () => {
  it('shows and opens an unknown evidence type', () => {
    const onInspect = vi.fn();
    const evidence = {
      id: 51,
      title: 'Unmapped evidence',
      description: 'Preserve this record for review.',
      evidence_type: 'future_type',
    } as unknown as Evidence;

    render(<EvidenceCard evidence={evidence} index={0} isNew={false} onInspect={onInspect} />);

    expect(screen.getByText('Unclassified Evidence')).toBeInTheDocument();
    expect(screen.getByText('Unmapped evidence')).toBeInTheDocument();
    expect(screen.getByText('Preserve this record for review.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Unclassified Evidence'));
    expect(onInspect).toHaveBeenCalledWith(evidence);
  });
});
