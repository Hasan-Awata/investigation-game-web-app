import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import MainMenu from '@/pages/MainMenu/MainMenu';
import Auth from '@/pages/Auth/Auth';
import GameRoom from '@/pages/GameRoom/GameRoom';
import AdminGuard from '@/components/AdminGuard';
import AdminDashboard from '@/pages/Admin/AdminDashboard';
import { getToken, logout } from '@/services/auth';
import type { User } from '@/types';

// 1. Initialize the client outside the component so it doesn't recreate on re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  useEffect(() => {
    const token = getToken();
    
    if (token) {
      setIsAuthenticated(true);
      const storedUser = localStorage.getItem('auth_user');
      if (storedUser) setUser(JSON.parse(storedUser));
    }
    setIsChecking(false);

    const handleForceLogout = () => {
      logout();
      localStorage.removeItem('auth_user');
      setIsAuthenticated(false);
      setUser(null);
      queryClient.clear(); 
    };

    window.addEventListener('auth:unauthorized', handleForceLogout);
    return () => window.removeEventListener('auth:unauthorized', handleForceLogout);
  }, []);

  if (isChecking) return <div className="terminal-text">Initializing Secure Connection...</div>;

  return (
    // 2. The Provider now wraps everything, ensuring Auth has access to useMutation
    <QueryClientProvider client={queryClient}>
      {!isAuthenticated ? (
        <Auth onSuccess={(userData: User) => {
          setIsAuthenticated(true);
          setUser(userData);
          localStorage.setItem('auth_user', JSON.stringify(userData));
        }} />
      ) : (
        <BrowserRouter>
          <Routes>
            {/* Standard Player Routes */}
            <Route path="/" element={<MainMenu />} />
            <Route path="/room/:inviteCode" element={<GameRoom />} />
            
            {/* Protected Admin Routes */}
            <Route path="/admin" element={<AdminGuard user={user} />}>
              <Route index element={<AdminDashboard />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      )}
    </QueryClientProvider>
  );
}

export default App;