import { type Result, success, failure } from '../utils/Result';
import { getSafeStringStorage, setSafeStringStorage, removeSafeStorage } from '@/utils/storage';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

/**
 * The token is an opaque string that is interpolated straight into the
 * `Authorization: Bearer ...` header. It MUST NOT go through the JSON
 * storage helpers: doing so would store it quoted and break every request.
 *
 * Do not "simplify" this by routing it through getSafeStorage/setSafeStorage
 * to reduce the helper count. Both directions corrupt auth silently:
 *   - setSafeStorage persists `"abc123"` *with literal quote characters*, so
 *     every outgoing Authorization header is malformed.
 *   - getSafeStorage calls JSON.parse on the legacy unquoted token, throws,
 *     and then trips its self-heal purge -- signing out every active user.
 *
 * Anything keyed off the token (see services/api.ts, services/adminApi.ts,
 * main.tsx, hooks/useAuth.ts, App.tsx) reads it through getToken(), so the
 * on-disk format is effectively a wire contract. Format drift here is an
 * authentication outage, not a cosmetic regression.
 */
const AUTH_TOKEN_KEY = 'auth_token';

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  XP: number;
}

interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export const login = async (email: string, password: string): Promise<Result<AuthResponse>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) return failure(data.message || 'Authentication failed');
    
    setSafeStringStorage('local', AUTH_TOKEN_KEY, data.token);
    return success(data);
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

export const register = async (username: string, name: string, email: string, password: string): Promise<Result<AuthResponse>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ username, name, email, password }),
    });

    const data = await response.json();

    if (!response.ok) return failure(data.message || 'Registration failed');
    
    setSafeStringStorage('local', AUTH_TOKEN_KEY, data.token);
    return success(data);
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

export const logout = () => {
  removeSafeStorage('local', AUTH_TOKEN_KEY);
};

/**
 * Always returns a string -- `''` when absent or unreadable, never null.
 *
 * The `Result`-based error contract of login/register is the public API of this
 * module and must be preserved; only the persistence line ever changes. This
 * getter is intentionally the non-throwing counterpart: a missing token is a
 * normal "not signed in" state, not an error.
 */
export const getToken = () => getSafeStringStorage('local', AUTH_TOKEN_KEY, '');