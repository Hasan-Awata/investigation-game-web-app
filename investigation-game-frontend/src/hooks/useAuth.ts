import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { login, register, getToken } from '@/services/auth';
import { ENV } from '@/config/env';
import type { User } from '@/types';

// Authoritative Session Verification Hook
export function useAuthSession() {
  return useQuery<User>({
    queryKey: ['authUser'],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error('No authentication token found.');

      const backendUrl = ENV.API_BASE_URL;
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

  const [cooldowns, setCooldowns] = useState({ login: 0, register: 0 });
  const submitting = useRef(false);
  const mode = isLogin ? 'login' : 'register';
  const retryAfterSeconds = cooldowns[mode];
  const cooling = cooldowns.login > 0 || cooldowns.register > 0;
  useEffect(() => {
    if (!cooling) return;
    const timer = window.setInterval(() => setCooldowns(current => ({
      login: Math.max(0, current.login - 1),
      register: Math.max(0, current.register - 1),
    })), 1000);
    return () => window.clearInterval(timer);
  }, [cooling]);

  const authMutation = useMutation({
    retry: false,
    mutationFn: async () => {
      const result = isLogin
        ? await login(email, password)
        : await register(username, name, email, password);

      if (!result.isSuccess) {
        const seconds = result.retryAfterSeconds;
        if (result.status === 429 && seconds) {
          setCooldowns(current => ({ ...current, [mode]: seconds }));
        }
        throw new Error(result.errorMessage);
      }
      return result.value;
    },
    onSettled: () => { submitting.current = false; },
    onSuccess: (data) => {
      // Seed the cache with the trusted server response directly
      queryClient.setQueryData(['authUser'], data.user);
      onSuccess(data.user);
    }
  });

  const toggleAuthMode = () => {
    if (submitting.current) return;
    setIsLogin(!isLogin);
    authMutation.reset();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current || retryAfterSeconds > 0) return;
    submitting.current = true;
    authMutation.mutate();
  };

  return {
    isLogin, toggleAuthMode,
    isLoading: authMutation.isPending,
    retryAfterSeconds,
    error: authMutation.error?.message || null,
    email, setEmail,
    password, setPassword,
    username, setUsername,
    name, setName,
    handleSubmit
  };
}
