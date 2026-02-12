
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Simple error boundary to surface runtime issues instead of a blank screen
class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; errorMessage: string }>{
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error?.message || 'Unknown error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Root render error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#050505', color: 'white', display: 'grid', placeItems: 'center', padding: '2rem', textAlign: 'center' }}>
          <div>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Something went wrong while rendering.</p>
            <p style={{ color: '#f87171', fontFamily: 'monospace' }}>{this.state.errorMessage}</p>
            <p style={{ marginTop: '1rem', color: '#9ca3af' }}>Check the browser console for stack traces.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
