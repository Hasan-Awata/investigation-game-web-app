import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import PopupDialog from './PopupDialog';

it('focuses the safe action and restores the trigger after dismissal', () => {
  const trigger = document.createElement('button');
  document.body.append(trigger);
  trigger.focus();
  const view = render(<PopupDialog title="Leave?" safeFocus actions={<><button>Stay</button><button disabled>Leaving</button></>}><p>Keep your progress.</p></PopupDialog>);
  expect(screen.getByRole('dialog', { name: 'Leave?' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Stay' })).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Leaving' })).toBeDisabled();
  view.unmount();
  expect(trigger).toHaveFocus();
  trigger.remove();
});

it('only dismisses when permitted and requires a backdrop press', () => {
  const dismiss = vi.fn();
  const props = { title: 'Notice', actions: <button>Understood</button>, children: <p>Message</p> };
  const view = render(<PopupDialog {...props} />);
  const dialog = screen.getByRole('dialog');
  const cancel = new Event('cancel', { cancelable: true });
  fireEvent(dialog, cancel);
  expect(cancel.defaultPrevented).toBe(true);
  view.rerender(<PopupDialog {...props} onDismiss={dismiss} />);
  fireEvent.click(dialog);
  expect(dismiss).not.toHaveBeenCalled();
  fireEvent.pointerDown(dialog);
  fireEvent.click(dialog);
  expect(dismiss).toHaveBeenCalledTimes(1);
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  expect(dismiss).toHaveBeenCalledTimes(2);
});

it('focuses the last available action when the primary action is disabled', () => {
  render(
    <PopupDialog title="Pending" actions={<><button>Cancel</button><button disabled>Saving</button></>}>
      <p>Please wait.</p>
    </PopupDialog>,
  );
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
});
