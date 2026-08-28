import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { login, register, getToken } from '@/services/auth';
import type { User } from '@/types';

// Authoritative Session Verification Hook
export function useAuthSession() {
  return useQuery<User>({
    queryKey: ['authUser'],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error('No authentication token found.');

      const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/user`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Session verification failed. Unauthorized access.');
      }

      return response.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // Cache the authoritative user object for 5 minutes
  });
}

export function useAuth(onSuccess: (user: User) => void) {
  const queryClient = useQueryClient();
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');

  const authMutation = useMutation({
    mutationFn: async () => {
      const result = isLogin
        ? await login(email, password)
        : await register(username, name, email, password);

      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: (data) => {
      // Seed the cache with the trusted server response directly
      queryClient.setQueryData(['authUser'], data.user);
      onSuccess(data.user);
    }
  });

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    authMutation.reset();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    authMutation.mutate();
  };

  return {
    isLogin, toggleAuthMode,
    isLoading: authMutation.isPending,
    error: authMutation.error?.message || null,
    email, setEmail,
    password, setPassword,
    username, setUsername,
    name, setName,
    handleSubmit
  };
}