import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ConfirmContext } from '@/pages/Admin/components/AdminUI/ConfirmContext';
import TemplateEditor from './TemplateEditor';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'en' } }) }));

it('lets an admin replace an unavailable version with the current layout of the same template', async () => {
  const onChange = vi.fn();
  const confirm = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  render(
    <ConfirmContext.Provider value={confirm}>
      <TemplateEditor type="document" template={{ id: 'background_check', version: 999, values: { subject: 'Saved subject' } }}
        files={{}} errors={{}} characters={[]} onChange={onChange} />
    </ConfirmContext.Provider>,
  );

  const picker = screen.getByRole('combobox', { name: 'Evidence template' });
  expect(picker).toHaveValue('');
  fireEvent.change(picker, { target: { value: 'background_check' } });
  await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
  expect(onChange).not.toHaveBeenCalled();

  fireEvent.change(picker, { target: { value: 'background_check' } });
  await waitFor(() => expect(onChange).toHaveBeenCalledWith({ id: 'background_check', version: 1, values: {} }, {}));
});
