import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ConfirmProvider } from './ConfirmDialog';
import { useConfirm } from './ConfirmContext';

vi.mock('@/pages/Admin/hooks/useAdminTranslation', () => ({ useAdminTranslation: () => ({ adminT: { component: { confirmDialog: { defaultTitle: 'Confirm', cancelBtn: 'Cancel', confirmBtn: 'Delete' } } } }) }));

it('preserves confirmation results, safe focus, Escape cancellation, and pending cleanup', async () => {
  const settled = vi.fn();
  function Trigger() {
    const confirm = useConfirm();
    return <button onClick={() => { void confirm({ message: 'Delete this entry?', danger: true }).then(settled); }}>Open</button>;
  }
  const view = render(<ConfirmProvider><Trigger /></ConfirmProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Open' }));
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  await waitFor(() => expect(settled).toHaveBeenLastCalledWith(true));
  fireEvent.click(screen.getByRole('button', { name: 'Open' }));
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
  await waitFor(() => expect(settled).toHaveBeenLastCalledWith(false));
  fireEvent.click(screen.getByRole('button', { name: 'Open' }));
  view.unmount();
  await waitFor(() => expect(settled).toHaveBeenCalledTimes(3));
  expect(settled).toHaveBeenLastCalledWith(false);
});
