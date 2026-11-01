import { expect, it, vi, afterEach } from 'vitest';
import { leaveRoomBeacon } from './api';

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
