import { afterEach, expect, it, vi } from 'vitest';
import { submitInvestigationRequest } from './api';
import { request } from './request';
import { success } from '@/utils/Result';

vi.mock('./request', () => ({ request: vi.fn(), getToken: vi.fn() }));
afterEach(() => vi.clearAllMocks());

it('sends request identity and items without a player-selected type', async () => {
  vi.mocked(request).mockResolvedValue(success({ request_id: 10 }));
  await submitInvestigationRequest(1, { requestId: 10, evidenceIds: [7], characterIds: [9] });
  expect(request).toHaveBeenCalledWith('/rooms/1/investigate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ request_id: 10, evidence_ids: [7], character_ids: [9] }),
  });
});
