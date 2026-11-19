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
  await waitFor(() => expect(onChange).toHaveBeenCalledWith({ id: 'background_check', version: 2, values: {} }, {}));
});

it('retains saved values and pending uploads when upgrading a Background Check', () => {
  const onChange = vi.fn();
  const values = {
    subject: 'Saved subject',
    reference: 'BC-772',
    fingerprints: '/assets/cases/1-sample/strip.png',
    arrests: [{ description: 'File 41-S', disposition: 'Released' }],
  };
  const files = { portrait: new File(['portrait'], 'portrait.png', { type: 'image/png' }) };
  vi.stubGlobal('URL', Object.assign(class extends URL {}, {
    createObjectURL: () => 'blob:portrait',
    revokeObjectURL: vi.fn(),
  }));

  try {
    const view = render(
      <ConfirmContext.Provider value={vi.fn()}>
        <TemplateEditor type="document" template={{ id: 'background_check', version: 1, values }}
          files={files} errors={{}} characters={[]} onChange={onChange} />
      </ConfirmContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Review template upgrade' }));
    expect(onChange).toHaveBeenCalledWith({ id: 'background_check', version: 2, values }, files);
    view.rerender(
      <ConfirmContext.Provider value={vi.fn()}>
        <TemplateEditor type="document" template={{ id: 'background_check', version: 2, values }}
          files={files} errors={{}} characters={[]} onChange={onChange} />
      </ConfirmContext.Provider>,
    );
    expect(screen.getByLabelText('Right thumb')).toHaveAttribute('type', 'file');
    expect(screen.getByLabelText('Reviewing officer’s signature')).toHaveAttribute('type', 'file');
    view.unmount();
  } finally {
    vi.unstubAllGlobals();
  }
});
