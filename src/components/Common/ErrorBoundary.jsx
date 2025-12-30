import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI with premium Solarized styling
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          minHeight: '400px',
          padding: '2rem',
          backgroundColor: 'transparent'
        }}>
          <div className="chart-card glow" style={{
            maxWidth: '600px',
            width: '100%',
            padding: '2rem',
            textAlign: 'center',
            border: '1px solid #dc322f' // Red border for error state
          }}>
            <h2 style={{ color: '#dc322f', marginBottom: '1rem', fontFamily: 'var(--font-heading)' }}>
              Application Error
            </h2>
            <p style={{ color: '#839496', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
              We encountered an unexpected issue.
            </p>

            <div style={{
              textAlign: 'left',
              background: '#073642',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '2rem',
              overflowX: 'auto',
              border: '1px solid #586e75'
            }}>
              <code style={{ color: '#dc322f', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                {this.state.error && this.state.error.toString()}
              </code>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="action-btn"
              style={{
                background: '#2aa198', // Cyan for action
                color: '#fdf6e3',
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '50px',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 8px rgba(0,0,0,0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
