import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import '@/i18n';
import type { DocDocument } from '@/types/evidence/doc';
import { DocBuilder } from './DocBuilder';

const { updateBlock } = vi.hoisted(() => ({ updateBlock: vi.fn() }));
vi.mock('./BlockPalette', () => ({ BlockPalette: () => null }));
vi.mock('./DocCanvas', () => ({ DocCanvas: () => null }));
vi.mock('@/pages/Admin/components/BlockBuilder/useBlockBuilder', () => ({
  useBlockBuilder: ({ doc }: { doc: DocDocument }) => ({
    sensors: [], collisionDetection: () => [], dndHandlers: {},
    selectedBlockId: 'image-1', selectedBlock: doc.blocks[0],
    selectBlock: vi.fn(), selectTemplate: vi.fn(), updateBlock,
    removeBlock: vi.fn(), duplicateBlock: vi.fn(), clear: vi.fn(),
  }),
}));

const doc: DocDocument = {
  v: 1, theme: 'case_file', page: { w: 800, minH: 1131, pad: 64 },
  blocks: [{ id: 'image-1', type: 'image', props: { url: '', caption: 'Photo' } }],
};

beforeEach(() => {
  localStorage.setItem('auth_token', 'synthetic-token');
  updateBlock.mockReset();
});
afterEach(() => {
  localStorage.removeItem('auth_token');
  vi.unstubAllGlobals();
});

it.each([true, false])('uploads an image from the inspector with storeLocally=%s', async storeLocally => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ url: 'https://game.test/image.png' }));
  vi.stubGlobal('fetch', fetch);
  const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
  render(<DocBuilder doc={doc} onChange={vi.fn()} caseId={3} storeLocally={storeLocally} evidenceId={7} />);

  fireEvent.click(screen.getByRole('button', { name: 'Upload Image' }));
  const picker = click.mock.contexts[0] as HTMLInputElement;
  expect(picker).toBeInstanceOf(HTMLInputElement);
  const file = new File(['synthetic-image'], 'photo.png', { type: 'image/png' });
  fireEvent.change(picker, { target: { files: [file] } });

  await waitFor(() => expect(updateBlock).toHaveBeenCalledWith('image-1', {
    props: { url: 'https://game.test/image.png', caption: 'Photo' },
  }));
  const [endpoint, options] = fetch.mock.calls[0] as [string, RequestInit];
  expect(endpoint).toContain('/admin/media/block-image');
  const body = options.body as FormData;
  expect(body.get('case_id')).toBe('3');
  expect(body.get('store_locally')).toBe(storeLocally ? '1' : '0');
  expect(body.get('image')).toBe(file);
});
