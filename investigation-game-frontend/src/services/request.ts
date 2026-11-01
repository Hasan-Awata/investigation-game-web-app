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

export interface ForbiddenDetail { endpoint: string; method: string; message: string }
export const FORBIDDEN_EVENT = 'api:forbidden';
export interface RequestPolicy { public?: boolean }

export const handleUnauthorized = (token = getToken()) => {
  if (!token || token !== getToken()) return;
  localStorage.removeItem('auth_token');
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
};

export async function request<T>(endpoint: string, options: RequestInit = {}, policy: RequestPolicy = {}): Promise<Result<T>> {
  const token = getToken();
  if (!policy.public && !token) return failure('Authentication required.', undefined, { status: 401 });
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(!policy.public && token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    if (!response.ok) {
      if (!policy.public && response.status === 401) handleUnauthorized(token);
      const data: { message?: string; errors?: ValidationErrors; retry_after?: unknown } = await response.json().catch(() => ({}));
      if (!policy.public && token === getToken() && response.status === 403) window.dispatchEvent(new CustomEvent<ForbiddenDetail>(FORBIDDEN_EVENT, { detail: { endpoint, method: options.method ?? 'GET', message: data.message || 'Access denied.' } }));
      return failure(data.message || `Operation failed (${response.status}).`, data.errors, { status: response.status, ...retryMetadata(response, data.retry_after) });
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!policy.public && token !== getToken()) return failure('Session changed.', undefined, { status: 401 });
    return success(data as T);
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
}

export async function requestBlob(endpoint: string, options: RequestInit = {}): Promise<Result<Blob>> {
  const token = getToken();
  if (!token) return failure('Authentication required.', undefined, { status: 401 });
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });
    if (!response.ok) {
      if (response.status === 401) handleUnauthorized(token);
      const data: { message?: string; errors?: ValidationErrors; retry_after?: unknown } = await response.json().catch(() => ({}));
      if (token === getToken() && response.status === 403) window.dispatchEvent(new CustomEvent<ForbiddenDetail>(FORBIDDEN_EVENT, { detail: { endpoint, method: options.method ?? 'GET', message: data.message || 'Access denied.' } }));
      return failure(data.message || `Operation failed (${response.status}).`, data.errors, { status: response.status, ...retryMetadata(response, data.retry_after) });
    }
    const blob = await response.blob();
    if (token !== getToken()) return failure('Session changed.', undefined, { status: 401 });
    return success(blob);
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
}
