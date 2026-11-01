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
    console.error('Uncaught React UI Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="container py-5 text-center">
          <div className="pmes-card mx-auto p-4 p-md-5" style={{ maxWidth: '580px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                marginBottom: '1.25rem'
              }}
            >
              <i className="bi bi-exclamation-triangle-fill"></i>
            </div>
            <h3 className="fw-bold text-dark mb-2">Something unexpected happened</h3>
            <p className="text-secondary mb-4" style={{ fontSize: '0.9rem' }}>
              We encountered a temporary rendering issue. Your data and session are safe.
            </p>
            {this.state.error?.message && (
              <div className="alert alert-light border text-start mb-4 py-2 font-monospace" style={{ fontSize: '0.8rem', color: '#64748b' }}>
                <i className="bi bi-bug me-1 text-danger"></i> {this.state.error.message}
              </div>
            )}
            <div className="d-flex justify-content-center gap-2">
              <button className="btn btn-pmes-secondary" onClick={() => window.location.reload()}>
                <i className="bi bi-arrow-clockwise me-1"></i> Reload Page
              </button>
              <button className="btn btn-pmes-primary" onClick={this.handleReset}>
                <i className="bi bi-house-door-fill me-1"></i> Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
