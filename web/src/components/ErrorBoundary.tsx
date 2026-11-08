import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled component error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-ink, #0b0c10)',
            color: 'var(--color-paper-light, #f4ede2)',
            padding: '2rem'
          }}
        >
          <div
            style={{
              maxWidth: '560px',
              width: '100%',
              backgroundColor: 'var(--color-ink-surface, #14161d)',
              border: '1px solid var(--color-docket-border, #2a2e3d)',
              borderRadius: '8px',
              padding: '2rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '0.8rem',
                color: 'var(--color-stamp-red, #d7263d)',
                letterSpacing: '1px',
                marginBottom: '0.5rem'
              }}
            >
              ⚠️ CASE FILE RENDERING INTERRUPTED
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-serif, Georgia, serif)',
                fontSize: '1.6rem',
                margin: '0.5rem 0 1rem 0'
              }}
            >
              An Unexpected Interface Error Occurred
            </h2>
            <p
              style={{
                fontSize: '0.88rem',
                color: 'var(--color-steel, #8c92a4)',
                lineHeight: '1.5',
                marginBottom: '1.5rem'
              }}
            >
              The application encountered a render issue. Your draft content, client vault guidelines, and precedent records remain fully intact.
            </p>
            {this.state.error && (
              <div
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '0.78rem',
                  backgroundColor: 'var(--color-ink, #0b0c10)',
                  border: '1px solid rgba(215, 38, 61, 0.3)',
                  color: 'var(--color-paper-light, #f4ede2)',
                  padding: '0.75rem 1rem',
                  borderRadius: '4px',
                  marginBottom: '1.5rem',
                  textAlign: 'left',
                  overflowX: 'auto'
                }}
              >
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="btn btn-primary"
              style={{
                padding: '0.7rem 1.5rem',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              🔄 Reload & Restore Case File
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
