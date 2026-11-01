import { afterEach, describe, expect, it, vi } from 'vitest';
import { request, requestBlob } from './request';
import { importAdminCase, exportAdminCase } from './adminApi';
import { failure } from '@/utils/Result';

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe.each([
  { name: 'request', send: () => request('/test') },
  { name: 'requestBlob', send: () => requestBlob('/test') },
  { name: 'importAdminCase', send: () => importAdminCase(new File(['x'], 'bundle.zip'), true) },
  { name: 'exportAdminCase', send: () => exportAdminCase(1) },
])('$name errors', ({ send }) => {
  it('preserves the summary and literal field-error keys', async () => {
    const errors = {
      'case.title': ['Title is required.', 'Title must be a string.'],
      'zones.0.levels.0.nodes.0.audio': ['Node audio is not supported.'],
      'evidences.0.metadata.doc.blocks.0.props.url': ['Image is missing.'],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ message: 'Invalid bundle.', errors }, { status: 422 })));

    expect(await send()).toEqual(failure('Invalid bundle.', errors));
  });

  it('keeps the sanitized 500 message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ message: 'Unable to create the case bundle.' }, { status: 500 })));

    expect(await send()).toEqual({ isSuccess: false, errorMessage: 'Unable to create the case bundle.' });
  });

  it('falls back to the HTTP status for a non-JSON error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Gateway', { status: 502 })));

    expect(await send()).toEqual(failure('Operation failed (502).'));
  });

  it('retains network errors as string failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network unavailable')));

    expect(await send()).toEqual(failure('Network unavailable'));
  });

  it.each([401, 403])('still clears authentication and emits the unauthorized event for %s', async status => {
    localStorage.setItem('auth_token', 'test-token');
    const listener = vi.fn();
    window.addEventListener('auth:unauthorized', listener, { once: true });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ message: 'Unauthorized.' }, { status })));

    expect(await send()).toEqual(failure('Unauthorized.'));
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('returns retry metadata without clearing a token or emitting unauthorized', async () => {
    localStorage.setItem('auth_token', 'valid');
    const listener = vi.fn();
    window.addEventListener('auth:unauthorized', listener);
    const fetch = vi.fn().mockResolvedValue(Response.json({ message: 'Wait', retry_after: 60 }, { status: 429 }));
    vi.stubGlobal('fetch', fetch);
    expect(await send()).toMatchObject({ isSuccess: false, status: 429, retryAfterSeconds: 60 });
    expect(localStorage.getItem('auth_token')).toBe('valid');
    expect(listener).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
    window.removeEventListener('auth:unauthorized', listener);
  });
});

it('keeps JSON and empty successes unchanged', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(Response.json({ case_id: 1 }))
    .mockResolvedValueOnce(new Response(null, { status: 204 })));

  expect(await request('/test')).toEqual({ isSuccess: true, value: { case_id: 1 } });
  expect(await request('/test')).toEqual({ isSuccess: true, value: null });
});

it('still returns a downloadable blob', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('zip bytes', { headers: { 'Content-Type': 'application/zip' } })));

  const result = await exportAdminCase(1);
  expect(result.isSuccess).toBe(true);
  if (!result.isSuccess) throw new Error(result.errorMessage);
  expect(result.value.type).toBe('application/zip');
  expect(await result.value.text()).toBe('zip bytes');
});

it.each([
  { body: {}, header: '12', expected: 12 },
  { body: { retry_after: -1 }, header: '12', expected: 12 },
  { body: { retry_after: 'invalid' }, header: 'invalid', expected: undefined },
])('handles fallback retry information: $header', async ({ body, header, expected }) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body, { status: 429, headers: { 'Retry-After': header } })));
  const result = await request('/login');
  expect(result.isSuccess).toBe(false);
  if (!result.isSuccess) expect(result.retryAfterSeconds).toBe(expected);
});
