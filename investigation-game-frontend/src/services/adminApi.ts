import { type Result, success, failure } from '@/utils/Result';
import { getToken } from './auth';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';
const API_BASE_URL = `${BASE_URL}/admin`;

// Reusing the event dispatcher from your standard API setup
const handleUnauthorized = () => {
  window.dispatchEvent(new CustomEvent('auth:unauthorized')); 
};

export const createAdminCase = async (formData: FormData): Promise<Result<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/cases`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`
        // Notice: NO Content-Type header. Let the browser handle the multipart boundary.
      },
      body: formData,
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) handleUnauthorized();
      const data = await response.json().catch(() => ({}));
      return failure(data.message || 'Failed to create case.');
    }
    
    return success(await response.json());
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

export const createAdminLevel = async (formData: FormData): Promise<Result<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/levels`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData,
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) handleUnauthorized();
      const data = await response.json().catch(() => ({}));
      return failure(data.message || 'Failed to create level.');
    }
    
    return success(await response.json());
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

export const createAdminEvidence = async (formData: FormData): Promise<Result<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/evidences`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData,
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) handleUnauthorized();
      const data = await response.json().catch(() => ({}));
      return failure(data.message || 'Failed to create evidence.');
    }
    
    return success(await response.json());
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

export const createAdminQuestion = async (formData: FormData): Promise<Result<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/questions`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData,
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) handleUnauthorized();
      const data = await response.json().catch(() => ({}));
      return failure(data.message || 'Failed to create question.');
    }
    
    return success(await response.json());
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

export const fetchAdminCases = async (): Promise<Result<any[]>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/cases`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) handleUnauthorized();
      const data = await response.json().catch(() => ({}));
      return failure(data.message || 'Failed to fetch admin cases.');
    }
    
    const data = await response.json();
    return success(data.cases);
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

export const deleteAdminCase = async (caseId: number): Promise<Result<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) handleUnauthorized();
      const data = await response.json().catch(() => ({}));
      return failure(data.message || 'Failed to delete case.');
    }
    
    return success(await response.json());
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

export const createAdminSuspect = async (formData: FormData): Promise<Result<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/suspects`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData,
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) handleUnauthorized();
      const data = await response.json().catch(() => ({}));
      return failure(data.message || 'Failed to create suspect.');
    }
    
    return success(await response.json());
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

export const createAdminInvestigationRequest = async (formData: FormData): Promise<Result<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/investigation-requests`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData, // Sending as FormData to match the rest of your admin architecture seamlessly
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) handleUnauthorized();
      const data = await response.json().catch(() => ({}));
      return failure(data.message || 'Failed to create investigation request.');
    }
    
    return success(await response.json());
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

export const createAdminPhase = async (formData: FormData): Promise<Result<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/phases`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData,
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) handleUnauthorized();
      const data = await response.json().catch(() => ({}));
      return failure(data.message || 'Failed to create phase.');
    }
    
    return success(await response.json());
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

// ==========================================
// CASES
// ==========================================
export const updateAdminCase = async (caseId: number, formData: FormData): Promise<Result<any>> => {
  // Laravel requires spoofing PUT requests when sending multipart/form-data (images)
  formData.append('_method', 'PUT'); 
  
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData,
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) handleUnauthorized();
      const data = await response.json().catch(() => ({}));
      return failure(data.message || 'Failed to update case.');
    }
    
    return success(await response.json());
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

// ==========================================
// PHASES
// ==========================================
export const updateAdminPhase = async (id: number, formData: FormData): Promise<Result<any>> => {
  formData.append('_method', 'PUT');
  try {
    const response = await fetch(`${API_BASE_URL}/phases/${id}`, { method: 'POST', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: formData });
    if (!response.ok) return failure('Failed to update phase.');
    return success(await response.json());
  } catch (error) { return failure((error as Error).message); }
};

export const deleteAdminPhase = async (id: number): Promise<Result<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/phases/${id}`, { method: 'DELETE', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${getToken()}` } });
    if (!response.ok) return failure('Failed to delete phase.');
    return success(await response.json());
  } catch (error) { return failure((error as Error).message); }
};

// ==========================================
// LEVELS
// ==========================================
export const updateAdminLevel = async (id: number, formData: FormData): Promise<Result<any>> => {
  formData.append('_method', 'PUT');
  try {
    const response = await fetch(`${API_BASE_URL}/levels/${id}`, { 
      method: 'POST', 
      headers: { 
        'Accept': 'application/json', 
        'Authorization': `Bearer ${getToken()}` 
      }, 
      body: formData 
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) handleUnauthorized();
      // Parse Laravel's error payload instead of discarding it
      const data = await response.json().catch(() => ({}));
      // This will now pipe the exact error (e.g., "The image field must not be greater...") into your UI
      return failure(data.message || 'Failed to update level.');
    }
    
    return success(await response.json());
  } catch (error) { 
    return failure((error as Error).message); 
  }
};

// ==========================================
// EVIDENCES
// ==========================================
export const updateAdminEvidence = async (id: number, formData: FormData): Promise<Result<any>> => {
  formData.append('_method', 'PUT');
  try {
    const response = await fetch(`${API_BASE_URL}/evidences/${id}`, { method: 'POST', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: formData });
    if (!response.ok) return failure('Failed to update evidence.');
    return success(await response.json());
  } catch (error) { return failure((error as Error).message); }
};

export const deleteAdminEvidence = async (id: number): Promise<Result<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/evidences/${id}`, { method: 'DELETE', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${getToken()}` } });
    if (!response.ok) return failure('Failed to delete evidence.');
    return success(await response.json());
  } catch (error) { return failure((error as Error).message); }
};

// ==========================================
// QUESTIONS & CHOICES
// ==========================================
export const updateAdminQuestion = async (id: number, formData: FormData): Promise<Result<any>> => {
  formData.append('_method', 'PUT');
  try {
    const response = await fetch(`${API_BASE_URL}/questions/${id}`, { method: 'POST', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: formData });
    if (!response.ok) return failure('Failed to update question.');
    return success(await response.json());
  } catch (error) { return failure((error as Error).message); }
};

export const deleteAdminQuestion = async (id: number): Promise<Result<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/questions/${id}`, { method: 'DELETE', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${getToken()}` } });
    if (!response.ok) return failure('Failed to delete question.');
    return success(await response.json());
  } catch (error) { return failure((error as Error).message); }
};

// ==========================================
// SUSPECTS
// ==========================================
export const updateAdminSuspect = async (id: number, formData: FormData): Promise<Result<any>> => {
  formData.append('_method', 'PUT');
  try {
    const response = await fetch(`${API_BASE_URL}/suspects/${id}`, { method: 'POST', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: formData });
    if (!response.ok) return failure('Failed to update suspect.');
    return success(await response.json());
  } catch (error) { return failure((error as Error).message); }
};

export const deleteAdminSuspect = async (id: number): Promise<Result<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/suspects/${id}`, { method: 'DELETE', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${getToken()}` } });
    if (!response.ok) return failure('Failed to delete suspect.');
    return success(await response.json());
  } catch (error) { return failure((error as Error).message); }
};

// ==========================================
// VICTIMS
// ==========================================
export const createAdminVictim = async (formData: FormData): Promise<Result<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/victims`, { method: 'POST', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: formData });
    if (!response.ok) return failure('Failed to create victim.');
    return success(await response.json());
  } catch (error) { return failure((error as Error).message); }
};

export const updateAdminVictim = async (id: number, formData: FormData): Promise<Result<any>> => {
  formData.append('_method', 'PUT');
  try {
    const response = await fetch(`${API_BASE_URL}/victims/${id}`, { method: 'POST', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: formData });
    if (!response.ok) return failure('Failed to update victim.');
    return success(await response.json());
  } catch (error) { return failure((error as Error).message); }
};

export const deleteAdminVictim = async (id: number): Promise<Result<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/victims/${id}`, { method: 'DELETE', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${getToken()}` } });
    if (!response.ok) return failure('Failed to delete victim.');
    return success(await response.json());
  } catch (error) { return failure((error as Error).message); }
};

// ==========================================
// INVESTIGATION REQUESTS
// ==========================================
export const updateAdminInvestigationRequest = async (id: number, formData: FormData): Promise<Result<any>> => {
  formData.append('_method', 'PUT');
  try {
    const response = await fetch(`${API_BASE_URL}/investigation-requests/${id}`, { method: 'POST', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: formData });
    if (!response.ok) return failure('Failed to update request.');
    return success(await response.json());
  } catch (error) { return failure((error as Error).message); }
};

export const deleteAdminInvestigationRequest = async (id: number): Promise<Result<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/investigation-requests/${id}`, { method: 'DELETE', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${getToken()}` } });
    if (!response.ok) return failure('Failed to delete request.');
    return success(await response.json());
  } catch (error) { return failure((error as Error).message); }
};