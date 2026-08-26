import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types';
import './Auth.css';

interface AuthProps {
  // Update this interface to accept the User object
  onSuccess: (user: User) => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const { t } = useTranslation();
  
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
        <h1 className="auth-title">{t('pages.auth.title')}</h1>
        <p className="auth-subtitle">
          {isLogin ? t('pages.auth.subtitleLogin') : t('pages.auth.subtitleRegister')}
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <>
              <input
                type="text" 
                placeholder={t('pages.auth.usernamePlaceholder')} 
                required 
                value={username}
                onChange={(e) => setUsername(e.target.value)} 
                className="auth-input"
              />
              <input
                type="text" 
                placeholder={t('pages.auth.fullNamePlaceholder')} 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)} 
                className="auth-input"
              />
            </>
          )}
          <input
            type="email" 
            placeholder={t('pages.auth.emailPlaceholder')} 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)} 
            className="auth-input"
          />
          <input
            type="password" 
            placeholder={t('pages.auth.passwordPlaceholder')} 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)} 
            className="auth-input"
          />

          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading 
              ? t('pages.auth.authenticating') 
              : (isLogin ? t('pages.auth.loginBtn') : t('pages.auth.registerBtn'))}
          </button>
        </form>

        <button type="button" className="auth-toggle" onClick={toggleAuthMode}>
          {isLogin ? t('pages.auth.toggleToRegister') : t('pages.auth.toggleToLogin')}
        </button>
      </div>
    </div>
  );
}