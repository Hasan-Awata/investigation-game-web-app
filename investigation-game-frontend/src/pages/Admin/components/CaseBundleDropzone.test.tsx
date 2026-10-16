import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CaseBundleDropzone from './CaseBundleDropzone';

const mocks = vi.hoisted(() => ({
  importEntity: vi.fn(),
  state: { isProcessing: false },
}));

vi.mock('@/pages/Admin/hooks/useAdminMutations', () => ({
  useAdminMutations: () => ({
    importEntity: mocks.importEntity,
    isProcessing: mocks.state.isProcessing,
  }),
}));

const renderDropzone = () => {
  const utils = render(<CaseBundleDropzone />);
  const input = utils.container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('file input not found');
  return { ...utils, input };
};

const selectFile = (input: HTMLInputElement, file: File) => {
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
};

const oversizedZip = () => {
  const file = new File(['x'], 'huge.zip', { type: 'application/zip' });
  Object.defineProperty(file, 'size', { value: 51 * 1024 * 1024 });
  return file;
};

describe('CaseBundleDropzone', () => {
  it('renders the dropzone copy', () => {
    renderDropzone();
    expect(screen.getByText('Import a case bundle')).toBeInTheDocument();
    expect(screen.getByText('Import bundle')).toBeDisabled();
  });

  it('rejects a non-zip file', () => {
    const { input } = renderDropzone();
    selectFile(input, new File(['x'], 'notes.txt', { type: 'text/plain' }));

    expect(screen.getByText('Only .zip case bundles are supported.')).toBeInTheDocument();
    expect(screen.queryByText('notes.txt')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import bundle' })).toBeDisabled();
  });

  it('rejects a zip over the size limit', () => {
    const { input } = renderDropzone();
    selectFile(input, oversizedZip());

    expect(screen.getByText('Bundle exceeds the 50MB upload limit.')).toBeInTheDocument();
    expect(screen.queryByText('huge.zip')).not.toBeInTheDocument();
  });

  it('accepts a zip and imports it with the store-locally flag', () => {
    const { input } = renderDropzone();
    const zip = new File(['x'], 'bundle.zip', { type: 'application/zip' });
    selectFile(input, zip);

    expect(screen.getByText('bundle.zip')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Import bundle' }));

    expect(mocks.importEntity).toHaveBeenCalledTimes(1);
    expect(mocks.importEntity).toHaveBeenCalledWith(
      { file: zip, storeLocally: false },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('clears the selected file', () => {
    const { input } = renderDropzone();
    selectFile(input, new File(['x'], 'bundle.zip', { type: 'application/zip' }));
    expect(screen.getByText('bundle.zip')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.queryByText('bundle.zip')).not.toBeInTheDocument();
  });
});
