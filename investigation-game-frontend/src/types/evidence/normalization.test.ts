import { describe, expect, it } from 'vitest';
import { ensureBlockIds, normalizeDoc } from './doc';
import { normalizeTerminal } from './terminal';

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

  it('retains unsupported terminal block types for a visible renderer fallback', () => {
    const terminal = normalizeTerminal({
      terminal: { blocks: [{ type: 'encryption_flow', props: { steps: [] } }] },
    });

    expect(terminal.blocks[0]).toMatchObject({
      type: 'unsupported',
      props: { originalType: 'encryption_flow' },
    });
  });
});
