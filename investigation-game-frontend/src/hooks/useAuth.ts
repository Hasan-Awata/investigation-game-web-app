import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { login, register, getToken } from '@/services/auth';
import { request } from '@/services/request';
import { AUTH_USER_KEY } from '@/utils/userState';
import { setSafeStorage } from '@/utils/storage';
import type { User } from '@/types';

// Authoritative Session Verification Hook
export function useAuthSession(token: string | null = getToken()) {
  return useQuery<User>({
    queryKey: ['authUser'],
    enabled: !!token,
    queryFn: async ({ signal }) => {
      const token = getToken();
      if (!token) throw new Error('No authentication token found.');

      const result = await request<User>('/user', { signal });
      if (!result.isSuccess) throw new Error(result.errorMessage);
      setSafeStorage('local', AUTH_USER_KEY, result.value);
      return result.value;
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
      setSafeStorage('local', AUTH_USER_KEY, data.user);
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
