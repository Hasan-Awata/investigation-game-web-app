import { describe, expect, it } from 'vitest';
import { ensureBlockIds, normalizeDoc } from './doc';

describe('evidence document normalization', () => {
  it('drops document blocks without an object props value', () => {
    const document = normalizeDoc({
      doc: { blocks: [{ type: 'prose' }, { type: 'prose', props: null }] },
    });

    expect(document.blocks).toEqual([]);
  });

  it('repairs a two-column block whose nested columns are missing', () => {
    const document = normalizeDoc({
      doc: { blocks: [{ type: 'two_column', props: {} }] },
    });

    expect(() => ensureBlockIds(document.blocks)).not.toThrow();
    expect(ensureBlockIds(document.blocks)[0]).toMatchObject({
      type: 'two_column',
      props: { left: [], right: [] },
    });
  });
});
