import { type Result, success, failure } from '@/utils/Result';
import { getToken } from './auth';

const API_BASE_URL = 'http://localhost:8000/api/admin';

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