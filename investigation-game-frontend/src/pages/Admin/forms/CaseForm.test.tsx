import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { GameCase } from '@/types';
import toast from 'react-hot-toast';
import CaseForm from './CaseForm';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn<(message: ReactNode) => void>() } }));
vi.mock('@/pages/Admin/hooks/useAdminData', () => ({ useAdminCases: () => ({ data: [] }) }));
vi.mock('@/pages/Admin/hooks/useAdminTranslation', () => ({ useAdminTranslation: () => ({ adminT: { forms: { caseForm: {} } } }) }));
vi.mock('@/pages/Admin/hooks/useAdminForm', () => ({
  useAdminForm: ({ initialState }: { initialState: Record<string, unknown> }) => ({ formData: initialState, editingId: 1 }),
}));
vi.mock('@/pages/Admin/components/EntityDashboard', () => ({
  default: ({ onExport }: { onExport: (gameCase: GameCase) => void }) => (
    <button onClick={() => onExport({ id: 1, title: 'Case', story: '', min_player_XP: 0, XP_on_solve: 100, max_strikes: 5 })}>Export</button>
  ),
}));

afterEach(() => vi.unstubAllGlobals());

it('shows all export field errors with their literal manifest paths', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
    message: 'Unable to export media.',
    errors: {
      'case.img_url': ['Cover image is missing.'],
      'evidences.0.metadata.url': ['Audio is unreadable.'],
      'evidences.1.metadata.doc.blocks.0.props.right.0.props.url': ['Image is missing.'],
    },
  }, { status: 422 })));
  render(<CaseForm />);
  fireEvent.click(screen.getByRole('button', { name: 'Export' }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));

  render(<>{vi.mocked(toast.error).mock.calls[0][0] as ReactNode}</>);
  expect(screen.getByText('Unable to export media.')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('case.img_url: Cover image is missing.');
  expect(screen.getAllByRole('listitem')[1]).toHaveTextContent('evidences.0.metadata.url: Audio is unreadable.');
  expect(screen.getAllByRole('listitem')[2]).toHaveTextContent('evidences.1.metadata.doc.blocks.0.props.right.0.props.url: Image is missing.');
  expect(toast.success).not.toHaveBeenCalled();
});

it('keeps sanitized archive errors as a plain message', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ message: 'Unable to create the case bundle.' }, { status: 500 })));
  render(<CaseForm />);
  fireEvent.click(screen.getByRole('button', { name: 'Export' }));

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Unable to create the case bundle.'));
  expect(toast.success).not.toHaveBeenCalled();
});
