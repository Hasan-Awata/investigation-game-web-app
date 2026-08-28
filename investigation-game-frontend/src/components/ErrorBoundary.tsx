import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  isLocal?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // In a production environment, log this to an error reporting service (e.g., Sentry)
    console.error('System Exception Caught by Boundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReturnHome = () => {
    // A hard redirect to flush the React tree and memory completely
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const { isLocal, fallbackMessage } = this.props;

      // Localized Quarantine UI
      if (isLocal) {
        return (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: 'rgba(163, 50, 50, 0.1)',
            border: '1px dashed var(--accent-crimson)',
            borderRadius: '8px',
            fontFamily: 'var(--font-mono)'
          }}>
            <h4 style={{ color: 'var(--accent-crimson)', margin: '0 0 1rem 0' }}>[ CORRUPTED DATA FRAGMENT ]</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {fallbackMessage || 'The requested payload could not be parsed. Render sequence aborted.'}
            </p>
            <button
              onClick={this.handleReset}
              style={{
                background: 'transparent', border: '1px solid var(--accent-crimson)',
                color: 'var(--accent-crimson)', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'var(--font-mono)'
              }}
            >
              Retry Decryption
            </button>
          </div>
        );
      }

      // Global Shield UI
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', backgroundColor: 'var(--bg-dark)', padding: '2rem', fontFamily: 'var(--font-mono)'
        }}>
          <div style={{ maxWidth: '600px', width: '100%' }}>
            <div style={{ borderBottom: '2px solid var(--accent-crimson)', paddingBottom: '1rem', marginBottom: '2rem' }}>
              <h1 style={{ color: 'var(--accent-crimson)', fontSize: '2.5rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                System Glitch
              </h1>
              <span style={{ color: 'var(--text-secondary)' }}>CRITICAL EXCEPTION: KERNEL PANIC</span>
            </div>

            <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              {fallbackMessage || 'An unrecoverable fault occurred within the UI rendering thread. The interface has been halted to prevent data corruption.'}
            </p>

            <div style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '4px', borderLeft: '4px solid var(--accent-crimson)', marginBottom: '3rem', color: 'var(--text-secondary)', fontSize: '0.85rem', overflowX: 'auto' }}>
              <code>{this.state.error?.message || 'Unknown Error'}</code>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={this.handleReset}
                style={{
                  background: 'var(--accent-crimson)', border: 'none', color: 'var(--bg-dark)',
                  padding: '1rem 2rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'var(--font-mono)'
                }}
              >
                Reinitialize UI
              </button>
              <button
                onClick={this.handleReturnHome}
                style={{
                  background: 'transparent', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)',
                  padding: '1rem 2rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'var(--font-mono)'
                }}
              >
                Return to Root Directory
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}