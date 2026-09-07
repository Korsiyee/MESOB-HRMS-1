import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#F2FBFA', padding: 24, fontFamily: 'sans-serif',
        }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: 32,
            maxWidth: 520, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            border: '1px solid #E5E7EB',
          }}>
            <h2 style={{ color: '#0F766E', marginBottom: 8, fontSize: 20, fontWeight: 700 }}>
              Something went wrong
            </h2>
            <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>
              The app encountered an error. Check the browser console for details.
            </p>
            <pre style={{
              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
              padding: 12, fontSize: 12, color: '#DC2626', overflowX: 'auto',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 16, padding: '10px 20px', background: '#0F766E',
                color: 'white', border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
