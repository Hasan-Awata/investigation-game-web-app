import { fireEvent, render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import '@/i18n';
import AdminLocationForm from './AdminLocationForm';

it.each([4 * 1024 * 1024, 4 * 1024 * 1024 + 1])('enforces the server image limit for a %i-byte location image', size => {
  const setImage = vi.fn();
  const { container } = render(<AdminLocationForm
    state={{ editingId: null, text: '', storeLocally: true, choices: [] }}
    setters={{ setText: vi.fn(), setStoreLocally: vi.fn(), setChoices: vi.fn() }}
    actions={{ registerFileRef: () => vi.fn(), handleSubmit: vi.fn(), handleCancel: vi.fn() }}
    status={{ isProcessing: false }} previews={{}} setImage={setImage}
    activeCoordinateTarget={null} setActiveCoordinateTarget={vi.fn()} handleCoordinateSelect={vi.fn()}
  />);
  const file = new File([new Uint8Array(size)], 'scene.png', { type: 'image/png' });
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;

  fireEvent.change(input, { target: { files: [file] } });

  expect(setImage).toHaveBeenCalledWith(size <= 4 * 1024 * 1024 ? file : null);
});
