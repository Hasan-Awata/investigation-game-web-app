import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainMenu from './pages/MainMenu/MainMenu';
import Auth from './pages/Auth/Auth';
import GameRoom from './pages/GameRoom/GameRoom';
import { getToken } from './services/auth';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  useEffect(() => {
    const token = getToken();
    if (token) setIsAuthenticated(true);
    setIsChecking(false);
  }, []);

  if (isChecking) return <div className="terminal-text">Initializing Secure Connection...</div>;

  if (!isAuthenticated) {
    return <Auth onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <BrowserRouter>
      <main>
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/room/:inviteCode" element={<GameRoom />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;