// Single source of truth for fetch + auth + error handling
import { type Result, type ValidationErrors, success, failure } from '@/utils/Result';
import { ENV } from '@/config/env';

const API_BASE_URL = ENV.API_URL;

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
      const data: { message?: string; errors?: ValidationErrors } = await response.json().catch(() => ({}));
      return failure(data.message || `Operation failed (${response.status}).`, data.errors);
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    return success(data as T);
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
      const data: { message?: string; errors?: ValidationErrors } = await response.json().catch(() => ({}));
      return failure(data.message || `Operation failed (${response.status}).`, data.errors);
    }
    return success(await response.blob());
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
}
