import { useState } from 'react';
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import QuickTradeCalc from '../trade/QuickTradeCalc';
import NewsFeed from '../dashboard/NewsFeed';
import PlayerRankings from '../dashboard/PlayerRankings';
import PlayerCompare from '../league/PlayerCompare';

const LANDING_TABS = [
  { id: 'players', label: 'Players' },
  { id: 'compare', label: 'Compare' },
  { id: 'news', label: 'News' },
];

const TAB_UPSELL = {
  players: 'Create an account to unlock roster-aware rankings, waiver suggestions, and trade targets personalized to your league.',
  compare: 'Sign up to layer in your league\u2019s scoring settings, roster context, and trade value on every comparison.',
  news: 'Create an account to filter news to your roster, opponents, and waiver wire \u2014 with live strategic context.',
};

export default function LandingPage() {
  const { user, loading } = useAuth();
  const { onSignIn, onSignUp } = useOutletContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('players');

  if (loading) return <div className="ff-loading-screen"><svg className="ff-hex-spinner" viewBox="0 0 48 52"><polygon points="24,2 46,14 46,38 24,50 2,38 2,14" /></svg>Loading</div>;
  if (user) return <Navigate to="/hub" replace />;

  return (
    <>
      <div className="ff-hero-landing">
        <div className="ff-hero-landing-glow" aria-hidden="true" />
        <div className="ff-hero-landing-hex-float" aria-hidden="true" />
        <img src="/logo-full.png" alt="HexMetrics" className="ff-hero-logo" />
        <p>The ultimate news and analysis platform for fantasy football. Beat your friends. Achieve glory.</p>
        <div className="ff-hero-landing-actions">
          <button className="ff-hero-action ff-hero-landing-action primary" onClick={onSignUp}>Create Account</button>
          <button className="ff-hero-action ff-hero-landing-action secondary" onClick={onSignIn}>Sign In</button>
        </div>
        <div className="ff-hero-landing-features">
          <div className="ff-feature-group">
            <span className="ff-feature-group-label">Core Tools</span>
            <div className="ff-feature-group-cards">
              <div className="ff-landing-feature">
                <span className="ff-landing-feature-hex">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="13,6 17,6 17,10"/><line x1="17" y1="6" x2="11" y2="12"/><polyline points="7,14 3,14 3,10"/><line x1="3" y1="14" x2="9" y2="8"/></svg>
                </span>
                <span className="ff-landing-feature-label">Trade Calculator</span>
              </div>
              <div className="ff-landing-feature">
                <span className="ff-landing-feature-hex">
                  <svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1.27L12.6 4.5v6.5L7 14.23 1.4 11V4.5z"/><circle cx="7" cy="6" r="1.5"/><path d="M4.5 11a2.5 2.5 0 015 0"/></svg>
                </span>
                <span className="ff-landing-feature-label">Player Database</span>
              </div>
              <div className="ff-landing-feature">
                <span className="ff-landing-feature-hex">
                  <svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1.27L12.6 4.5v6.5L7 14.23 1.4 11V4.5z"/><line x1="5.5" y1="5" x2="5.5" y2="10.5"/><line x1="8.5" y1="5" x2="8.5" y2="10.5"/><line x1="4" y1="7.75" x2="10" y2="7.75"/></svg>
                </span>
                <span className="ff-landing-feature-label">Player Compare</span>
              </div>
              <div className="ff-landing-feature">
                <span className="ff-landing-feature-hex">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="10" cy="10" r="2"/><path d="M10,2 v4 M10,14 v4 M2,10 h4 M14,10 h4"/></svg>
                </span>
                <span className="ff-landing-feature-label">Live News Feed</span>
              </div>
            </div>
          </div>
          <div className="ff-feature-group">
            <span className="ff-feature-group-label">League Features <span className="ff-feature-group-badge"><svg viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1.5" y="5.5" width="7" height="5" rx="1"/><path d="M3 5.5V4a2 2 0 014 0v1.5"/></svg>Unlocks after draft</span></span>
            <div className="ff-feature-group-cards">
              <div className="ff-landing-feature ff-landing-feature--locked">
                <span className="ff-landing-feature-hex">
                  <svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1.27L12.6 4.5v6.5L7 14.23 1.4 11V4.5z"/><line x1="4.5" y1="5.5" x2="9.5" y2="5.5"/><line x1="4.5" y1="7.75" x2="9.5" y2="7.75"/><line x1="4.5" y1="10" x2="9.5" y2="10"/></svg>
                  <span className="ff-landing-feature-lock"><svg viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1.5" y="5.5" width="7" height="5" rx="1"/><path d="M3 5.5V4a2 2 0 014 0v1.5"/></svg></span>
                </span>
                <span className="ff-landing-feature-label">Lineup</span>
              </div>
              <div className="ff-landing-feature ff-landing-feature--locked">
                <span className="ff-landing-feature-hex">
                  <svg viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 1.5L8 0 11 1.5v3L8 6 5 4.5z"/><path d="M5 7.5L8 6 11 7.5v3L8 12 5 10.5z" opacity="0.5"/></svg>
                  <span className="ff-landing-feature-lock"><svg viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1.5" y="5.5" width="7" height="5" rx="1"/><path d="M3 5.5V4a2 2 0 014 0v1.5"/></svg></span>
                </span>
                <span className="ff-landing-feature-label">Matchups</span>
              </div>
              <div className="ff-landing-feature ff-landing-feature--locked">
                <span className="ff-landing-feature-hex">
                  <svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1.27L12.6 4.5v6.5L7 14.23 1.4 11V4.5z"/><line x1="4.5" y1="10.5" x2="4.5" y2="8"/><line x1="7" y1="10.5" x2="7" y2="5.5"/><line x1="9.5" y1="10.5" x2="9.5" y2="7"/></svg>
                  <span className="ff-landing-feature-lock"><svg viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1.5" y="5.5" width="7" height="5" rx="1"/><path d="M3 5.5V4a2 2 0 014 0v1.5"/></svg></span>
                </span>
                <span className="ff-landing-feature-label">Standings</span>
              </div>
              <div className="ff-landing-feature ff-landing-feature--locked">
                <span className="ff-landing-feature-hex">
                  <svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1.27L12.6 4.5v6.5L7 14.23 1.4 11V4.5z"/><line x1="7" y1="5.5" x2="7" y2="10"/><line x1="4.5" y1="7.75" x2="9.5" y2="7.75"/></svg>
                  <span className="ff-landing-feature-lock"><svg viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1.5" y="5.5" width="7" height="5" rx="1"/><path d="M3 5.5V4a2 2 0 014 0v1.5"/></svg></span>
                </span>
                <span className="ff-landing-feature-label">Waivers</span>
              </div>
              <div className="ff-landing-feature ff-landing-feature--locked">
                <span className="ff-landing-feature-hex">
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="10,3 13,3 13,6"/><line x1="13" y1="3" x2="8" y2="8"/><polyline points="4,11 1,11 1,8"/><line x1="1" y1="11" x2="6" y2="6"/></svg>
                  <span className="ff-landing-feature-lock"><svg viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1.5" y="5.5" width="7" height="5" rx="1"/><path d="M3 5.5V4a2 2 0 014 0v1.5"/></svg></span>
                </span>
                <span className="ff-landing-feature-label">Trade Center</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="ff-landing-trade-header">
        <div className="ff-landing-trade-header-bar">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width="18" height="18">
            <polyline points="13,6 17,6 17,10"/><line x1="17" y1="6" x2="11" y2="12"/>
            <polyline points="7,14 3,14 3,10"/><line x1="3" y1="14" x2="9" y2="8"/>
          </svg>
          <span>Trade Calculator</span>
        </div>
        <div className="ff-landing-trade-body">
          <QuickTradeCalc onSignIn={onSignIn} onSignUp={onSignUp} />
        </div>
      </div>
      <div className="ff-landing-hub-preview">
        <div className="ff-hub-tabs">
          <div className="ff-tabs-container">
            {LANDING_TABS.map(t => (
              <button
                key={t.id}
                className={`ff-league-tab${activeTab === t.id ? ' active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="ff-tab-content ff-tab-content-full">
          <div className="ff-hub-upsell">
            <p>{TAB_UPSELL[activeTab]}</p>
            <button className="ff-btn ff-btn-copper ff-btn-sm" onClick={onSignUp}>Create Account</button>
          </div>
          {activeTab === 'players' && <PlayerRankings />}
          {activeTab === 'compare' && <PlayerCompare />}
          {activeTab === 'news' && <NewsFeed />}
        </div>
      </div>
    </>
  );
}
