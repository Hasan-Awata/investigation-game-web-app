import { type Result, success, failure } from '../utils/Result';

const API_BASE_URL = 'http://localhost:8000/api';

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
    
    localStorage.setItem('auth_token', data.token);
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
    
    localStorage.setItem('auth_token', data.token);
    return success(data);
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Network error');
  }
};

export const logout = () => {
  localStorage.removeItem('auth_token');
};

export const getToken = () => localStorage.getItem('auth_token');