import { describe, expect, it } from 'vitest';
import { serializeFormData } from './serializeFormData';

describe('serializeFormData', () => {
  it('encodes booleans as 1/0', () => {
    const fd = serializeFormData({ is_initial: true, store_locally: false });
    expect(fd.get('is_initial')).toBe('1');
    expect(fd.get('store_locally')).toBe('0');
  });

  it('omits null and undefined values', () => {
    const fd = serializeFormData({ a: null, b: undefined, c: 'x' });
    expect(fd.has('a')).toBe(false);
    expect(fd.has('b')).toBe(false);
    expect(fd.get('c')).toBe('x');
  });

  it('encodes arrays with indexed bracket keys', () => {
    const fd = serializeFormData({ required_evidence_ids: [1, 2, 3] });
    expect(fd.get('required_evidence_ids[0]')).toBe('1');
    expect(fd.get('required_evidence_ids[2]')).toBe('3');
    expect(fd.has('required_evidence_ids[3]')).toBe(false);
  });

  it('skips null items in arrays while preserving later index positions', () => {
    const fd = serializeFormData({ list: ['a', null, 'c'] });
    expect(fd.get('list[0]')).toBe('a');
    expect(fd.has('list[1]')).toBe(false);
    expect(fd.get('list[2]')).toBe('c');
  });

  it('encodes nested objects as bracket paths', () => {
    const fd = serializeFormData({
      choices: [
        { text: 'A', outcomes: { gives_strike: true, feedback: 'nope' } },
        { text: 'B', outcomes: { gives_strike: false } },
      ],
    });
    expect(fd.get('choices[0][text]')).toBe('A');
    expect(fd.get('choices[0][outcomes][gives_strike]')).toBe('1');
    expect(fd.get('choices[0][outcomes][feedback]')).toBe('nope');
    expect(fd.get('choices[1][outcomes][gives_strike]')).toBe('0');
  });

  it('serializes metadata as a single raw JSON string', () => {
    const metadata = {
      doc: { theme: 'plain', blocks: [], page: { pad: 24 } },
      terminal: { blocks: [], ordered: false },
    };
    const fd = serializeFormData({ title: 'X', metadata });
    expect(fd.get('metadata')).toBe(JSON.stringify(metadata));
    expect(fd.has('metadata[doc]')).toBe(false);
  });

  it('appends File/Blob values verbatim', () => {
    const file = new File(['abc'], 'bundle.zip', { type: 'application/zip' });
    const fd = serializeFormData({ file });
    expect(fd.get('file')).toBe(file);
  });

  it('stringifies numbers and strings', () => {
    const fd = serializeFormData({ level_id: 7, text: 'hello' });
    expect(fd.get('level_id')).toBe('7');
    expect(fd.get('text')).toBe('hello');
  });
});
