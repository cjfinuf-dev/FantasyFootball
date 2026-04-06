import { Navigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import QuickTradeCalc from '../trade/QuickTradeCalc';
import NewsFeed from '../dashboard/NewsFeed';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const { onSignIn, onSignUp } = useOutletContext();

  if (loading) return <div className="ff-loading-screen"><svg className="ff-hex-spinner" viewBox="0 0 48 52"><polygon points="24,2 46,14 46,38 24,50 2,38 2,14" /></svg>Loading</div>;
  if (user) return <Navigate to="/hub" replace />;

  return (
    <>
      <div className="ff-hero ff-hero-landing">
        <img src="/logo-full.png" alt="HexMetrics" className="ff-hero-logo" />
        <p>The ultimate news and analysis platform for fantasy football. Beat your friends. Achieve glory.</p>
        <div className="ff-hero-landing-actions">
          <button className="ff-hero-action ff-hero-landing-action primary" onClick={onSignUp}>Create Account</button>
          <button className="ff-hero-action ff-hero-landing-action secondary" onClick={onSignIn}>Sign In</button>
        </div>
        <div className="ff-hero-landing-features">
          <div className="ff-landing-feature">
            <span className="ff-landing-feature-hex">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="13,6 17,6 17,10"/><line x1="17" y1="6" x2="11" y2="12"/><polyline points="7,14 3,14 3,10"/><line x1="3" y1="14" x2="9" y2="8"/></svg>
            </span>
            <span className="ff-landing-feature-label">Trade Calculator</span>
          </div>
          <div className="ff-landing-feature">
            <span className="ff-landing-feature-hex">
              <svg viewBox="0 0 20 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10,2 L18,6.5 L18,15.5 L10,20 L2,15.5 L2,6.5z"/><path d="M10,2 L10,20" opacity="0.3"/></svg>
            </span>
            <span className="ff-landing-feature-label">Multiple Leagues</span>
          </div>
          <div className="ff-landing-feature">
            <span className="ff-landing-feature-hex">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="10" cy="10" r="2"/><path d="M10,2 v4 M10,14 v4 M2,10 h4 M14,10 h4"/></svg>
            </span>
            <span className="ff-landing-feature-label">Live News Feed</span>
          </div>
          <div className="ff-landing-feature">
            <span className="ff-landing-feature-hex">
              <svg viewBox="0 0 20 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10,2 L18,6.5 L18,15.5 L10,20 L2,15.5 L2,6.5z"/><line x1="6" y1="9" x2="14" y2="9"/><line x1="6" y1="12" x2="11" y2="12"/></svg>
            </span>
            <span className="ff-landing-feature-label">Custom Scoring</span>
          </div>
        </div>
      </div>
      <div className="ff-tab-content-full" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
          <QuickTradeCalc onSignIn={onSignIn} onSignUp={onSignUp} />
        </div>
        <NewsFeed />
      </div>
    </>
  );
}
