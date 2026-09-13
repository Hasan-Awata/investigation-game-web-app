import { type Result, success, failure } from '@/utils/Result';
import { getToken } from './auth';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';
const API_BASE_URL = `${BASE_URL}/admin`;

const handleUnauthorized = () => {
  window.dispatchEvent(new CustomEvent('auth:unauthorized')); 
};

/**
 * Centralized API Request Handler
 */
const adminRequest = async <T = any>(endpoint: string, options: RequestInit): Promise<Result<T>> => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) handleUnauthorized();
      const data = await response.json().catch(() => ({}));
      return failure(data.message || `Operation failed (${response.status}).`);
    }
    
    return success(await response.json());
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

// ==========================================
// CASES
// ==========================================
export const fetchAdminCases = async (): Promise<Result<any[]>> => {
  const result = await adminRequest('/cases', { method: 'GET' });
  return result.isSuccess ? success(result.value.cases) : result;
};
export const createAdminCase = (fd: FormData) => adminRequest('/cases', { method: 'POST', body: fd });
export const updateAdminCase = (id: number, fd: FormData) => { fd.append('_method', 'PUT'); return adminRequest(`/cases/${id}`, { method: 'POST', body: fd }); };
export const deleteAdminCase = (id: number) => adminRequest(`/cases/${id}`, { method: 'DELETE' });
export const importAdminCase = (payload: any) => adminRequest('/cases/import', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });

// ==========================================
// ZONES (Formerly Phases)
// ==========================================
export const fetchAdminZones = async (caseId: string | number): Promise<Result<any[]>> => {
  if (!caseId) return success([]);
  return await adminRequest(`/cases/${caseId}/zones`, { method: 'GET' });
};

export const createAdminZone = (fd: FormData) => adminRequest('/zones', { method: 'POST', body: fd });
export const updateAdminZone = (id: number, fd: FormData) => { fd.append('_method', 'PUT'); return adminRequest(`/zones/${id}`, { method: 'POST', body: fd }); };
export const deleteAdminZone = (id: number) => adminRequest(`/zones/${id}`, { method: 'DELETE' });

// ==========================================
// LEVELS
// ==========================================
export const fetchAdminLevels = async (zoneId: string | number): Promise<Result<any[]>> => {
  if (!zoneId) return success([]);
  return await adminRequest(`/zones/${zoneId}/levels`, { method: 'GET' });
};

export const createAdminLevel = (fd: FormData) => adminRequest('/levels', { method: 'POST', body: fd });
export const updateAdminLevel = (id: number, fd: FormData) => { fd.append('_method', 'PUT'); return adminRequest(`/levels/${id}`, { method: 'POST', body: fd }); };
export const deleteAdminLevel = (id: number) => adminRequest(`/levels/${id}`, { method: 'DELETE' });

// ==========================================
// QUESTIONS (Nodes, Intercepts, Locations)
// ==========================================
export const createAdminQuestion = (fd: FormData) => adminRequest('/questions', { method: 'POST', body: fd });
export const updateAdminQuestion = (id: number, fd: FormData) => { fd.append('_method', 'PUT'); return adminRequest(`/questions/${id}`, { method: 'POST', body: fd }); };
export const deleteAdminQuestion = (id: number) => adminRequest(`/questions/${id}`, { method: 'DELETE' });

// ==========================================
// EVIDENCES
// ==========================================
export const createAdminEvidence = (fd: FormData) => adminRequest('/evidences', { method: 'POST', body: fd });
export const updateAdminEvidence = (id: number, fd: FormData) => { fd.append('_method', 'PUT'); return adminRequest(`/evidences/${id}`, { method: 'POST', body: fd }); };
export const deleteAdminEvidence = (id: number) => adminRequest(`/evidences/${id}`, { method: 'DELETE' });

// ==========================================
// INVESTIGATION REQUESTS (Combos)
// ==========================================
export const createAdminInvestigationRequest = (fd: FormData) => adminRequest('/investigation-requests', { method: 'POST', body: fd });
export const updateAdminInvestigationRequest = (id: number, fd: FormData) => { fd.append('_method', 'PUT'); return adminRequest(`/investigation-requests/${id}`, { method: 'POST', body: fd }); };
export const deleteAdminInvestigationRequest = (id: number) => adminRequest(`/investigation-requests/${id}`, { method: 'DELETE' });

// ==========================================
// CHARACTERS
// ==========================================
export const createAdminCharacter = (fd: FormData) => adminRequest('/characters', { method: 'POST', body: fd });
export const updateAdminCharacter = (id: number, fd: FormData) => { fd.append('_method', 'PUT'); return adminRequest(`/characters/${id}`, { method: 'POST', body: fd }); };
export const deleteAdminCharacter = (id: number) => adminRequest(`/characters/${id}`, { method: 'DELETE' });