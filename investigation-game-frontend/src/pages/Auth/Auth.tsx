import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types';
import './Auth.css';

interface AuthProps {
  // Update this interface to accept the User object
  onSuccess: (user: User) => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const {
    isLogin, toggleAuthMode,
    isLoading, error,
    email, setEmail,
    password, setPassword,
    username, setUsername,
    name, setName,
    handleSubmit
  } = useAuth(onSuccess);

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

        <button type="button" className="auth-toggle" onClick={toggleAuthMode}>
          {isLogin ? 'Need clearance? Register here.' : 'Already have access? Login.'}
        </button>
      </div>
    </div>
  );
}