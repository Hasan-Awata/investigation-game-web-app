import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { login, register } from '@/services/auth';
import type { User } from '@/types';

// 1. Update the parameter signature to expect a User
export function useAuth(onSuccess: (user: User) => void) {
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
      // 2. Pass the returned user object up to the parent component
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