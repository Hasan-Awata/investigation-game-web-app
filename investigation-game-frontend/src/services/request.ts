// Single source of truth for fetch + auth + error handling
import { type Result, success, failure } from '@/utils/Result';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

export const getToken = () => localStorage.getItem('auth_token');

export const handleUnauthorized = () => {
  localStorage.removeItem('auth_token');
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
};

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<Result<T>> {
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
}

export async function requestBlob(endpoint: string, options: RequestInit = {}): Promise<Result<Blob>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        ...options.headers,
      },
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) handleUnauthorized();
      const data = await response.json().catch(() => ({}));
      return failure(data.message || `Operation failed (${response.status}).`);
    }
    return success(await response.blob());
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
}