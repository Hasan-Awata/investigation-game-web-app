import { type Result, success } from '../utils/Result';
import type { GameCase, GameRoom, User, FinalStats, RoomInspection, VoteResponse, EncounterGroup } from '../types';
import { request, getToken } from './request';
import { ENV } from '@/config/env';

interface RoomResponse {
  message?: string;
  room: GameRoom;
}

type LockVoteResponse = VoteResponse;

interface SubmitSuspectVerdictResponse {
  status: string;
  message: string;
  room?: GameRoom;
  stats?: FinalStats;
}

interface InspectLocationResponse {
  inspection: RoomInspection;
}

interface LeaveRoomResponse {
  message: string;
}

export const fetchCases = async (): Promise<Result<{ cases: GameCase[], user: User }>> => {
  const result = await request<{ cases: GameCase[], user: User }>('/cases');
  return result;
};

export const createRoom = async (caseId: number): Promise<Result<GameRoom>> => {
  const result = await request<RoomResponse>('/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ case_id: caseId }),
  });
  return result.isSuccess ? success(result.value.room) : result;
};

export const joinRoom = async (inviteCode: string): Promise<Result<GameRoom>> => {
  const result = await request<RoomResponse>('/rooms/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invite_code: inviteCode }),
  });
  return result.isSuccess ? success(result.value.room) : result;
};

export const restartRoom = async (caseId: number, inviteCode: string): Promise<Result<GameRoom>> => {
  const result = await request<RoomResponse>('/rooms/restart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ case_id: caseId, invite_code: inviteCode }),
    signal: AbortSignal.timeout(15_000),
  });
  return result.isSuccess ? success(result.value.room) : result;
};

export const fetchRoomState = async (roomId: number, signal?: AbortSignal): Promise<Result<GameRoom>> => {
  const result = await request<RoomResponse>(`/rooms/${roomId}`, { signal });
  return result.isSuccess ? success(result.value.room) : result;
};

export const lockVote = async (roomId: number, questionId: number, choiceId: number): Promise<Result<LockVoteResponse>> => {
  const result = await request<LockVoteResponse>(`/rooms/${roomId}/questions/${questionId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ choice_id: choiceId }),
  });
  return result;
};

export const startEncounterGroup = async (roomId: number, levelId: number): Promise<Result<{ group: EncounterGroup }>> => {
  const result = await request<{ group: EncounterGroup }>(`/rooms/${roomId}/levels/${levelId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return result;
};

export const joinEncounterGroup = async (roomId: number, groupId: number): Promise<Result<{ group: EncounterGroup }>> => {
  return request<{ group: EncounterGroup }>(`/rooms/${roomId}/encounter-groups/${groupId}/join`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
  });
};

export const clearVote = async (roomId: number, questionId: number): Promise<Result<{ group: EncounterGroup }>> => {
  return request<{ group: EncounterGroup }>(`/rooms/${roomId}/questions/${questionId}/vote`, { method: 'DELETE' });
};

export const submitSuspectVerdict = async (
  roomId: number,
  guiltyCharacterIds: number[]
): Promise<Result<SubmitSuspectVerdictResponse>> => {
  const result = await request<SubmitSuspectVerdictResponse>(`/rooms/${roomId}/suspects/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guilty_character_ids: guiltyCharacterIds })
  });
  return result;
};

export const submitInvestigationRequest = async (
  roomId: number,
  payload: { evidenceIds?: number[]; characterIds?: number[] }
): Promise<Result<{ status: string; message: string; unlocked_evidence: number[]; unlocked_levels?: number[] }>> => {
  const result = await request<{ status: string; message: string; unlocked_evidence: number[]; unlocked_levels?: number[] }>(`/rooms/${roomId}/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ evidence_ids: payload.evidenceIds ?? [], character_ids: payload.characterIds ?? [] })
  });
  return result;
};

export const inspectLocation = async (roomId: number, choiceId: number): Promise<Result<InspectLocationResponse>> => {
  const result = await request<InspectLocationResponse>(`/rooms/${roomId}/inspect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ choice_id: choiceId }),
  });
  return result;
};

export const leaveRoom = async (roomId: number): Promise<Result<LeaveRoomResponse>> => {
  const result = await request<LeaveRoomResponse>(`/rooms/${roomId}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return result;
};

/**
 * Browser departure preserves lone-host sessions and migrates multiplayer hosts.
 *
 * Runs on `pagehide` so a host who closes the tab without the exit modal
 * still triggers host migration. `keepalive: true` lets the request survive
 * navigation; `sendBeacon` cannot carry the Bearer token header, so a
 * fetch-with-keepalive is the only transport that satisfies the auth guard.
 * Fire-and-forget: failures are intentionally swallowed (the caller is being
 * torn down, there is nobody to show an error to).
 */
export const leaveRoomBeacon = async (roomId: number): Promise<void> => {
  try {
    await fetch(`${ENV.API_URL}/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'pagehide' }),
      keepalive: true,
    });
  } catch {
    // Intentionally silent — cannot surface feedback during unload.
  }
};
