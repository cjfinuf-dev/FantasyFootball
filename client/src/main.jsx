import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LeaguesProvider } from './context/LeaguesContext';
import { LiveScoringProvider } from './context/LiveScoringContext';
import App from './App';
import './index.css';
import './styles/trade.css';
import './styles/chat.css';
import './styles/compare.css';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return <div style={{ padding: 40, color: '#ff4444', fontFamily: 'monospace', background: '#111', minHeight: '100vh' }}>
        <h1>App crashed</h1>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.message}{'\n'}{this.state.error.stack}</pre>
      </div>;
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <LeaguesProvider>
            <LiveScoringProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </LiveScoringProvider>
          </LeaguesProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
