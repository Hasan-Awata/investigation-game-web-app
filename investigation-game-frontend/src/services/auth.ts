import { type Result } from '../utils/Result';
import type { User } from '../types';
import { request, getToken } from './request';

const AUTH_TOKEN_KEY = 'auth_token';

interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export { getToken };

export const login = async (email: string, password: string): Promise<Result<AuthResponse>> => {
  const result = await request<AuthResponse>('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  if (result.isSuccess) {
    localStorage.setItem(AUTH_TOKEN_KEY, result.value.token);
  }
  return result;
};

export const register = async (username: string, name: string, email: string, password: string): Promise<Result<AuthResponse>> => {
  const result = await request<AuthResponse>('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, name, email, password }),
  });
  
  if (result.isSuccess) {
    localStorage.setItem(AUTH_TOKEN_KEY, result.value.token);
  }
  return result;
};

export const logout = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};