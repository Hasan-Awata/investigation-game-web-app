import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';

import MainMenu from '@/pages/MainMenu/MainMenu';
import Auth from '@/pages/Auth/Auth';
import GameRoom from '@/pages/GameRoom/GameRoom';
import AdminGuard from '@/components/AdminGuard';
import AdminDashboard from '@/pages/Admin/AdminDashboard';
import { getToken, logout } from '@/services/auth';
import { useAuthSession } from '@/hooks/useAuth';
import ErrorBoundary from '@/components/ErrorBoundary';

// Initialize the client outside the component so it doesn't recreate on re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

function AppRouter() {
  const queryClient = useQueryClient();
  const token = getToken();

  // Rely strictly on the server evaluation
  const { data: user, isLoading, isError } = useAuthSession();

  // The kill-switch state to instantly sever the component tree on 401
  const [isSessionRevoked, setIsSessionRevoked] = useState(false);

  useEffect(() => {
    const handleForceLogout = () => {
      // 1. Nuke the token immediately
      logout();
      
      // Safe execution context to prevent unhandled storage exceptions
      try {
        localStorage.removeItem('auth_user'); 
      } catch (e) {
        console.warn('Storage operation restricted by browser:', e);
      }

      // 2. Instantly sever the protected UI tree to prevent a refetch stampede
      setIsSessionRevoked(true);

      // 3. Defer the cache wipe to the next execution tick, ensuring the component tree is gone
      setTimeout(() => {
        queryClient.cancelQueries();
        queryClient.clear();
      }, 50);
    };

    window.addEventListener('auth:unauthorized', handleForceLogout);
    return () => window.removeEventListener('auth:unauthorized', handleForceLogout);
  }, [queryClient]);

  // If the kill-switch is thrown, render the Auth module and wait for a new session
  if (isSessionRevoked) {
    return <Auth onSuccess={(userData) => {
      setIsSessionRevoked(false);
      queryClient.setQueryData(['authUser'], userData);
    }} />;
  }

  // Secure connection state handling
  if (token && isLoading) {
    return <div className="terminal-text">Verifying Secure Connection...</div>;
  }

  // Determine authentication purely off the TanStack query resolution
  const isAuthenticated = !!user && !isError;

  return (
    <>
      {!isAuthenticated ? (
        <Auth onSuccess={(userData) => {
          queryClient.setQueryData(['authUser'], userData);
        }} />
      ) : (
        <ErrorBoundary fallbackMessage="The routing engine encountered an unhandled exception. Interface offline.">
          <BrowserRouter>
            <Routes>
              {/* Standard Player Routes */}
              <Route path="/" element={<MainMenu />} />
              <Route path="/room/:inviteCode" element={<GameRoom />} />

              {/* Protected Admin Routes */}
              <Route path="/admin" element={<AdminGuard />}>
                <Route index element={<AdminDashboard />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      )}
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>
  );
}