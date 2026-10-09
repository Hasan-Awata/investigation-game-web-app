import { type Result, success } from '@/utils/Result';
import { request } from './request';
import type { GameCase, Zone, Level } from '@/types';

const adminRequest = async <T>(endpoint: string, options: RequestInit): Promise<Result<T>> => {
  return request<T>(`/admin${endpoint}`, options);
};

// ==========================================
// CASES
// ==========================================
export const fetchAdminCases = async (): Promise<Result<GameCase[]>> => {
  const result = await adminRequest<{ cases: GameCase[] }>('/cases', { method: 'GET' });
  return result.isSuccess ? success(result.value.cases) : result;
};
export const createAdminCase = (fd: FormData) => adminRequest('/cases', { method: 'POST', body: fd });
export const updateAdminCase = (id: number, fd: FormData) => { fd.append('_method', 'PUT'); return adminRequest(`/cases/${id}`, { method: 'POST', body: fd }); };
export const deleteAdminCase = (id: number) => adminRequest(`/cases/${id}`, { method: 'DELETE' });
export const importAdminCase = (payload: unknown) => adminRequest('/cases/import', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });

// ==========================================
// ZONES (Formerly Phases)
// ==========================================
export const fetchAdminZones = async (caseId: string | number): Promise<Result<Zone[]>> => {
  if (!caseId) return success([]);
  return await adminRequest<Zone[]>(`/cases/${caseId}/zones`, { method: 'GET' });
};

export const createAdminZone = (fd: FormData) => adminRequest('/zones', { method: 'POST', body: fd });
export const updateAdminZone = (id: number, fd: FormData) => { fd.append('_method', 'PUT'); return adminRequest(`/zones/${id}`, { method: 'POST', body: fd }); };
export const deleteAdminZone = (id: number) => adminRequest(`/zones/${id}`, { method: 'DELETE' });

// ==========================================
// LEVELS
// ==========================================
export const fetchAdminLevels = async (zoneId: string | number): Promise<Result<Level[]>> => {
  if (!zoneId) return success([]);
  return await adminRequest<Level[]>(`/zones/${zoneId}/levels`, { method: 'GET' });
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

/**
 * Block-image upload. Deliberately separate from the evidence create/update
 * call: an `image` block's URL lives in `metadata.doc`, and the author uploads
 * it long before the evidence row exists. See AdminMediaController.
 */
export const uploadAdminBlockImage = (fd: FormData) => adminRequest<{ url: string }>('/media/block-image', { method: 'POST', body: fd });

// ==========================================
// INVESTIGATION REQUESTS (Combos)
// ==========================================
const REQUIRED_ITEM_KEYS = ['required_evidence_ids', 'required_character_ids'];

const withRequiredItemArrays = (fd: FormData): FormData => {
  if (!REQUIRED_ITEM_KEYS.some((key) => fd.has(key))) return fd;

  const normalized = new FormData();
  fd.forEach((value, key) => {
    if (!REQUIRED_ITEM_KEYS.includes(key)) {
      normalized.append(key, value);
      return;
    }

    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
    const ids: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

    ids.forEach((id) => {
      const idValue = String(id).trim();
      if (idValue !== '') normalized.append(`${key}[]`, idValue);
    });
  });

  return normalized;
};

export const createAdminInvestigationRequest = (fd: FormData) => adminRequest('/investigation-requests', { method: 'POST', body: withRequiredItemArrays(fd) });
export const updateAdminInvestigationRequest = (id: number, fd: FormData) => { fd.append('_method', 'PUT'); return adminRequest(`/investigation-requests/${id}`, { method: 'POST', body: withRequiredItemArrays(fd) }); };
export const deleteAdminInvestigationRequest = (id: number) => adminRequest(`/investigation-requests/${id}`, { method: 'DELETE' });

// ==========================================
// CHARACTERS
// ==========================================
export const createAdminCharacter = (fd: FormData) => adminRequest('/characters', { method: 'POST', body: fd });
export const updateAdminCharacter = (id: number, fd: FormData) => { fd.append('_method', 'PUT'); return adminRequest(`/characters/${id}`, { method: 'POST', body: fd }); };
export const deleteAdminCharacter = (id: number) => adminRequest(`/characters/${id}`, { method: 'DELETE' });