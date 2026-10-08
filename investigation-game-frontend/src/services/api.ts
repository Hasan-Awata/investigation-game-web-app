import { type Result, success } from '../utils/Result';
import type { GameCase, GameRoom, User, FinalStats, RoomVote, Question, RoomInspection } from '../types'; 
import { request } from './request';

interface RoomResponse {
  message?: string;
  room: GameRoom;
}

interface LockVoteResponse {
  vote: RoomVote;
}

interface InitiatePhaseResponse {
  room: GameRoom;
}

interface SubmitSuspectVerdictResponse {
  status: string;
  message: string;
  room?: GameRoom;
  stats?: FinalStats;
}

interface TriggerWiretapResponse {
  played_wiretap: Question;
  message?: string;
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

export const fetchRoomState = async (roomId: number): Promise<Result<GameRoom>> => {
  const result = await request<RoomResponse>(`/rooms/${roomId}`);
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

export const submitAssessment = async (roomId: number): Promise<Result<{ status: string; message: string }>> => {
  const result = await request<{ status: string; message: string }>(`/rooms/${roomId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return result;
};

export const initiatePhase = async (roomId: number, levelId: number): Promise<Result<InitiatePhaseResponse>> => {
  const result = await request<InitiatePhaseResponse>(`/rooms/${roomId}/levels/${levelId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return result;
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
  evidenceIds: number[]
): Promise<Result<{ status: string; message: string; unlocked_evidence: number[]; unlocked_levels?: number[] }>> => {  
  const result = await request<{ status: string; message: string; unlocked_evidence: number[]; unlocked_levels?: number[] }>(`/rooms/${roomId}/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ evidence_ids: evidenceIds })
  });
  return result;
};

export const triggerWiretap = async (roomId: number, questionId: number): Promise<Result<TriggerWiretapResponse>> => {
  const result = await request<TriggerWiretapResponse>(`/rooms/${roomId}/questions/${questionId}/wiretap/play`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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