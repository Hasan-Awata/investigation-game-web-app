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
  await waitFor(() => expect(onChange).toHaveBeenCalledWith({ id: 'background_check', version: 3, values: {} }, {}));
});

it('edits the shared fingerprint choice without affecting the portrait', () => {
  const onChange = vi.fn();
  const values = {
    subject: 'Saved subject',
    reference: 'BC-772',
    fingerprint_asset: 'loop',
    portrait: '/assets/cases/1-sample/Evidences/portrait.png',
    arrests: [{ description: 'File 41-S', disposition: 'Released' }],
  };
  const template = { id: 'background_check', version: 3, values };
  render(
    <ConfirmContext.Provider value={vi.fn()}>
      <TemplateEditor type="document" template={template}
        files={{}} errors={{}} characters={[]} onChange={onChange} />
    </ConfirmContext.Provider>,
  );
  const picker = screen.getByRole('combobox', { name: 'Fingerprint pattern' });
  expect(picker).toHaveValue('loop');
  expect(screen.queryByLabelText('Right thumb')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Subject photograph')).toHaveAttribute('type', 'file');
  fireEvent.change(picker, { target: { value: 'arch' } });
  expect(onChange).toHaveBeenLastCalledWith({
    ...template, values: { ...values, fingerprint_asset: 'arch' },
  }, {});
});
