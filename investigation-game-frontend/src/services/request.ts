// Single source of truth for fetch + auth + error handling
import { type Result, type ValidationErrors, success, failure } from '@/utils/Result';
import { ENV } from '@/config/env';

const API_BASE_URL = ENV.API_URL;

function retryMetadata(response: Response, body: unknown) {
  if (response.status !== 429) return undefined;
  const header = response.headers.get('Retry-After');
  const bodySeconds = typeof body === 'number' && Number.isFinite(body) && body > 0 ? body : undefined;
  const headerSeconds = header ? Number(header) : NaN;
  const seconds = bodySeconds ?? (Number.isFinite(headerSeconds) ? headerSeconds : header ? (Date.parse(header) - Date.now()) / 1000 : NaN);
  return { status: 429, ...(Number.isFinite(seconds) && seconds > 0 ? { retryAfterSeconds: Math.ceil(seconds) } : {}) };
}

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
      const data: { message?: string; errors?: ValidationErrors; retry_after?: unknown } = await response.json().catch(() => ({}));
      return failure(data.message || `Operation failed (${response.status}).`, data.errors, retryMetadata(response, data.retry_after));
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
      const data: { message?: string; errors?: ValidationErrors; retry_after?: unknown } = await response.json().catch(() => ({}));
      return failure(data.message || `Operation failed (${response.status}).`, data.errors, retryMetadata(response, data.retry_after));
    }
    return success(await response.blob());
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
}
