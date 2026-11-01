import { expect, it, vi, afterEach } from 'vitest';
import { joinRoom, leaveRoomBeacon, restartRoom } from './api';

afterEach(() => vi.unstubAllGlobals());
it('labels authenticated keepalive requests as browser departure', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response());
  vi.stubGlobal('fetch', fetch);
  localStorage.setItem('auth_token', 'test-token');
  await leaveRoomBeacon(1);
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/rooms/1/leave'), expect.objectContaining({
    keepalive: true, body: JSON.stringify({ reason: 'pagehide' }),
    headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
  }));
  localStorage.removeItem('auth_token');
});

it('restarts using server discovery and a bounded request without tab storage', async () => {
  sessionStorage.clear();
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ room: { id: 2, invite_code: 'NEW123' } })));
  vi.stubGlobal('fetch', fetch);
  localStorage.setItem('auth_token', 'test-token');
  const result = await restartRoom(7, 'OLD123');
  expect(result.isSuccess).toBe(true);
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/rooms/restart'), expect.objectContaining({
    method: 'POST', body: JSON.stringify({ case_id: 7, invite_code: 'OLD123' }),
    signal: expect.any(AbortSignal),
    headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
  }));
  localStorage.removeItem('auth_token');
});

it('bounds joins and propagates cancellation to the membership request', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ room: { id: 1 } }));
  vi.stubGlobal('fetch', fetch);
  localStorage.setItem('auth_token', 'test-token');
  const controller = new AbortController();
  try {
    await joinRoom('ABC123', controller.signal);
    const options = fetch.mock.calls[0][1] as RequestInit;
    expect(options.signal?.aborted).toBe(false);
    controller.abort();
    expect(options.signal?.aborted).toBe(true);
  } finally {
    localStorage.removeItem('auth_token');
  }
});
