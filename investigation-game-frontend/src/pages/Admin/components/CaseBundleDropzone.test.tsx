import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ImportBundlePayload } from '@/pages/Admin/hooks/useAdminMutations';
import type { ValidationErrors } from '@/utils/Result';
import CaseBundleDropzone from './CaseBundleDropzone';

const mocks = vi.hoisted(() => ({
  importEntity: vi.fn<(payload: ImportBundlePayload, callbacks: {
    onSuccess: () => void;
    onError: (error: Error & { errors?: ValidationErrors }) => void;
  }) => void>(),
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
  beforeEach(() => {
    mocks.state.isProcessing = false;
  });

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

  it.each([
    ['picker', new File(['x'], 'notes.txt')],
    ['picker', oversizedZip()],
    ['drop', new File(['x'], 'notes.txt')],
    ['drop', oversizedZip()],
  ])('clears a valid zip after an invalid replacement via %s (%s)', (source, replacement) => {
    const { input } = renderDropzone();
    selectFile(input, new File(['x'], 'original.zip'));

    if (source === 'picker') {
      selectFile(input, replacement);
    } else {
      fireEvent.drop(input.closest('label')!, { dataTransfer: { files: [replacement] } });
    }

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('original.zip')).not.toBeInTheDocument();
    expect(input.value).toBe('');
    expect(screen.getByRole('button', { name: 'Import bundle' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Import bundle' }));
    expect(mocks.importEntity).not.toHaveBeenCalled();
  });

  it('locks the picker, drops, removal and storage choice while importing', () => {
    const { input, rerender } = renderDropzone();
    selectFile(input, new File(['x'], 'submitted.zip'));
    fireEvent.click(screen.getByRole('button', { name: 'Import bundle' }));

    mocks.state.isProcessing = true;
    rerender(<CaseBundleDropzone />);
    expect(input).toBeDisabled();
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Importing bundle...' })).toBeDisabled();

    selectFile(input, new File(['x'], 'replacement.zip'));
    fireEvent.drop(input.closest('label')!, { dataTransfer: { files: [new File(['x'], 'dropped.zip')] } });
    (screen.getByRole('checkbox') as HTMLInputElement).click();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    fireEvent.click(screen.getByRole('button', { name: 'Importing bundle...' }));

    expect(screen.getByText('submitted.zip')).toBeInTheDocument();
    expect(screen.queryByText('replacement.zip')).not.toBeInTheDocument();
    expect(screen.queryByText('dropped.zip')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(mocks.importEntity).toHaveBeenCalledTimes(1);

    act(() => mocks.importEntity.mock.calls[0][1].onSuccess());
    expect(screen.queryByText('submitted.zip')).not.toBeInTheDocument();
  });

  it('does not clear a newer selection when an earlier import succeeds', () => {
    const { input } = renderDropzone();
    selectFile(input, new File(['x'], 'submitted.zip'));
    fireEvent.click(screen.getByRole('button', { name: 'Import bundle' }));
    selectFile(input, new File(['x'], 'newer.zip'));

    act(() => mocks.importEntity.mock.calls[0][1].onSuccess());

    expect(screen.getByText('newer.zip')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import bundle' })).toBeEnabled();
  });

  it('lists every literal manifest path and message, retains the file and clears errors on retry', () => {
    const { input } = renderDropzone();
    selectFile(input, new File(['x'], 'bundle.zip'));
    fireEvent.click(screen.getByRole('button', { name: 'Import bundle' }));
    act(() => mocks.importEntity.mock.calls[0][1].onError(Object.assign(new Error('Invalid bundle.'), {
      errors: {
        'case.title': ['The title is required.', 'The title must be a string.'],
        'zones.0.levels.0.nodes.1.audio': ['Node audio is not supported.'],
        'evidences.0.metadata.doc.blocks.0.props.left.0.props.url': ['Image media is missing.'],
      },
    })));

    const alert = screen.getByRole('alert');
    expect(within(alert).getAllByRole('listitem')).toHaveLength(4);
    expect(alert).toHaveTextContent('case.title: The title is required.');
    expect(alert).toHaveTextContent('case.title: The title must be a string.');
    expect(alert).toHaveTextContent('zones.0.levels.0.nodes.1.audio: Node audio is not supported.');
    expect(alert).toHaveTextContent('evidences.0.metadata.doc.blocks.0.props.left.0.props.url: Image media is missing.');
    expect(screen.getByText('bundle.zip')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Import bundle' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mocks.importEntity).toHaveBeenCalledTimes(2);
  });

  it('clears a server error when selecting another zip', () => {
    const { input } = renderDropzone();
    selectFile(input, new File(['x'], 'bundle.zip'));
    fireEvent.click(screen.getByRole('button', { name: 'Import bundle' }));
    act(() => mocks.importEntity.mock.calls[0][1].onError(new Error('Import failed.')));
    expect(screen.getByRole('alert')).toHaveTextContent('Import failed.');

    selectFile(input, new File(['x'], 'fixed.zip'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('fixed.zip')).toBeInTheDocument();
  });
});
