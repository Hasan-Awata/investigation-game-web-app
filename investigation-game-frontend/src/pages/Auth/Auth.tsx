import { useState } from 'react';
import { login, register } from '../../services/auth';
import './Auth.css';

interface AuthProps {
  onSuccess: () => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = isLogin 
      ? await login(email, password)
      : await register(username, name, email, password);

    if (result.isSuccess) {
      onSuccess(); // Triggers the transition to the Main Menu
    } else {
      setError(result.errorMessage);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-panel glass-panel">
        <h1 className="auth-title">System Access</h1>
        <p className="auth-subtitle">
          {isLogin ? 'Provide credentials to access case files.' : 'Register a new investigator profile.'}
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <>
              <input 
                type="text" placeholder="Username" required value={username}
                onChange={(e) => setUsername(e.target.value)} className="auth-input"
              />
              <input 
                type="text" placeholder="Full Name" required value={name}
                onChange={(e) => setName(e.target.value)} className="auth-input"
              />
            </>
          )}
          <input 
            type="email" placeholder="Email Address" required value={email}
            onChange={(e) => setEmail(e.target.value)} className="auth-input"
          />
          <input 
            type="password" placeholder="Password" required value={password}
            onChange={(e) => setPassword(e.target.value)} className="auth-input"
          />

          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Authenticating...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>

        <button className="auth-toggle" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Need clearance? Register here.' : 'Already have access? Login.'}
        </button>
      </div>
    </div>
  );
}