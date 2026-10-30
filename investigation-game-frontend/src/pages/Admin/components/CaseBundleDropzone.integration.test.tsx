import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import CaseBundleDropzone from './CaseBundleDropzone';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

afterEach(() => vi.unstubAllGlobals());

it('shows server field errors through the real API and mutation, then retries successfully', async () => {
  const fetchMock = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({
      message: 'Invalid bundle.',
      errors: {
        'case.title': ['Title is required.'],
        'zones.0.levels.0.nodes.0.audio': ['Node audio is not supported.'],
        'evidences.0.metadata.doc.blocks.0.props.url': ['Image is missing.'],
      },
    }, { status: 422 }))
    .mockResolvedValueOnce(Response.json({ message: 'Imported.', case_id: 1 }));
  vi.stubGlobal('fetch', fetchMock);
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const { container } = render(<QueryClientProvider client={client}><CaseBundleDropzone /></QueryClientProvider>);
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
  const zip = new File(['x'], 'bundle.zip', { type: 'application/zip' });
  fireEvent.change(input, { target: { files: [zip] } });
  fireEvent.click(screen.getByRole('button', { name: 'Import bundle' }));

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('case.title: Title is required.');
  expect(alert).toHaveTextContent('zones.0.levels.0.nodes.0.audio: Node audio is not supported.');
  expect(alert).toHaveTextContent('evidences.0.metadata.doc.blocks.0.props.url: Image is missing.');
  expect(toast.error).toHaveBeenCalledWith('Invalid bundle.');
  expect(screen.getByText('bundle.zip')).toBeInTheDocument();
  expect(invalidate).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Import bundle' }));
  await waitFor(() => expect(screen.queryByText('bundle.zip')).not.toBeInTheDocument());
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(input.value).toBe('');
  expect(screen.getByRole('checkbox')).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Import bundle' })).toBeDisabled();
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['adminCases'] });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  const body = fetchMock.mock.calls[1][1]?.body;
  expect(body).toBeInstanceOf(FormData);
  expect((body as FormData).get('file')).toBe(zip);
  expect((body as FormData).get('store_locally')).toBe('1');
  client.clear();
});
