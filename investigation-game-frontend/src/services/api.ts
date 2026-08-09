import { type Result, success, failure } from '../utils/Result';
import type { GameCase, GameRoom, User } from '../types'; 
import { getToken, logout } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const handleUnauthorized = () => {
  logout();
  window.dispatchEvent(new CustomEvent('auth:unauthorized')); 
};

export const fetchCases = async (): Promise<Result<{ cases: GameCase[], user: User }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/cases`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        return failure('Session expired.');
      }
      return failure(`Server responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    // Return both pieces of data
    return success({ cases: data.cases, user: data.user });
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

export const createRoom = async (caseId: number): Promise<Result<GameRoom>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ case_id: caseId }),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        return failure('Session expired.');
      }
      const data = await response.json();
      return failure(data.message || 'Failed to create session.');
    }
    
    const data = await response.json();
    return success(data.room);
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

export const joinRoom = async (inviteCode: string): Promise<Result<GameRoom>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ invite_code: inviteCode }),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        return failure('Session expired.');
      }
      const data = await response.json();
      return failure(data.message || 'Failed to join session.');
    }
    
    const data = await response.json();
    return success(data.room);
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

export const fetchRoomState = async (roomId: number): Promise<Result<GameRoom>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        return failure('Session expired.');
      }
      const data = await response.json();
      return failure(data.message || 'Failed to fetch room state.');
    }
    
    const data = await response.json();
    return success(data.room);
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

export const lockVote = async (roomId: number, questionId: number, choiceId: number): Promise<Result<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/questions/${questionId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ choice_id: choiceId }),
    });
    
    if (!response.ok) {
      if (response.status === 401) handleUnauthorized();
      return failure('Failed to lock vote.');
    }
    return success(await response.json());
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

export const submitAssessment = async (roomId: number): Promise<Result<{ 
  status: string; 
  message: string; 
}>> => {  
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) handleUnauthorized();
      
      const data = await response.json().catch(() => null);
      return failure(data?.message || 'Failed to submit theory.');
    }
    return success(await response.json());
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

export const initiatePhase = async (roomId: number, levelId: number): Promise<Result<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/levels/${levelId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) handleUnauthorized();
      const data = await response.json().catch(() => null);
      return failure(data?.message || 'Failed to initiate phase.');
    }
    return success(await response.json());
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

export const submitSuspectVerdict = async (
  roomId: number, 
  guiltySuspectIds: number[]
): Promise<Result<{ status: string; message: string; room?: GameRoom; stats?: any }>> => {  
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/suspects/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ guilty_suspect_ids: guiltySuspectIds })
    });
    
    if (!response.ok) {
      if (response.status === 401) handleUnauthorized();
      const data = await response.json().catch(() => null);
      return failure(data?.message || 'Failed to submit final verdict.');
    }
    return success(await response.json());
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

export const submitInvestigationRequest = async (
  roomId: number, 
  evidenceIds: number[]
): Promise<Result<{ status: string; message: string; unlocked_evidence: number[]; unlocked_levels?: number[] }>> => {  
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/investigate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ evidence_ids: evidenceIds })
    });
    
    if (!response.ok) {
      if (response.status === 401) handleUnauthorized();
      const data = await response.json().catch(() => null);
      return failure(data?.message || 'The DA denied your request.');
    }
    return success(await response.json());
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

export const triggerWiretap = async (roomId: number, questionId: number): Promise<Result<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/questions/${questionId}/wiretap/play`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) handleUnauthorized();
      const data = await response.json().catch(() => null);
      return failure(data?.message || 'Failed to trigger wiretap.');
    }
    return success(await response.json());
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};