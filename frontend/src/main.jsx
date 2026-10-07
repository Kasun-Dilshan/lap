import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#0f172a', fontFamily: 'Inter, sans-serif', padding: 24 }}>
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>CLTMS could not open this page</h1>
            <p style={{ fontSize: 14, color: '#475569', margin: '0 0 16px' }}>{this.state.error.message}</p>
            <button type="button" onClick={() => window.location.reload()} style={{ background: '#059669', color: '#fff', border: 0, borderRadius: 8, padding: '8px 14px', fontWeight: 600 }}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
