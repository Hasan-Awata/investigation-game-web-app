import { afterEach, expect, it, vi } from 'vitest';
import { submitInvestigationRequest } from './api';
import { request } from './request';
import { failure, success } from '@/utils/Result';

vi.mock('./request', () => ({ request: vi.fn(), getToken: vi.fn() }));
afterEach(() => vi.clearAllMocks());

it('sends request identity and items without a player-selected type', async () => {
  vi.mocked(request).mockResolvedValue(success({ request_id: 10 }));
  await submitInvestigationRequest(1, { requestId: 10, evidenceIds: [7], characterIds: [9] });
  const [path, options] = vi.mocked(request).mock.calls[0];
  expect(path).toBe('/rooms/1/investigate');
  expect(options?.method).toBe('POST');
  expect(JSON.parse(String(options?.body))).toEqual({
    request_id: 10, evidence_ids: [7], character_ids: [9], attempt_id: expect.any(String),
  });
});

it('reuses the same attempt after a lost response and assigns a new ID to a deliberate retry', async () => {
  vi.mocked(request).mockResolvedValueOnce(failure('Network error')).mockResolvedValue(success({ request_id: 10 }));
  const payload = { requestId: 10, evidenceIds: [7], characterIds: [9] };
  await submitInvestigationRequest(1, payload);
  await submitInvestigationRequest(1, payload);
  const bodies = vi.mocked(request).mock.calls.map(([, options]) => options?.body);
  expect(bodies).toHaveLength(3);
  expect(bodies[1]).toBe(bodies[0]);
  expect(bodies[2]).not.toBe(bodies[0]);
});
