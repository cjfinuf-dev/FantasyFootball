import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './context/ThemeContext';
import AuthModal from './components/auth/AuthModal';
import NewsFeed from './components/dashboard/NewsFeed';
import MatchupWidget from './components/dashboard/MatchupWidget';
import PlayerRankings from './components/dashboard/PlayerRankings';
import StandingsCard from './components/sidebar/StandingsCard';
import WaiverWireCard from './components/sidebar/WaiverWireCard';
import PowerRankingsCard from './components/sidebar/PowerRankingsCard';
import * as leagueApi from './api/leagues';

export default function App() {
  const { user, loading, signout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showAuthModal, setShowAuthModal] = useState(null);
  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [leagueForm, setLeagueForm] = useState({ name: '', teamName: '', type: 'redraft', scoring: 'standard', size: 12, season: '2025-26' });
  const [leagueError, setLeagueError] = useState('');
  const [leagueCreating, setLeagueCreating] = useState(false);

  const handleCreateLeague = async (e) => {
    e.preventDefault();
    setLeagueError('');
    if (!leagueForm.name.trim() || !leagueForm.teamName.trim()) { setLeagueError('League name and team name are required.'); return; }
    setLeagueCreating(true);
    try {
      await leagueApi.createLeague({ name: leagueForm.name, teamName: leagueForm.teamName, type: leagueForm.type, scoringPreset: leagueForm.scoring, leagueSize: leagueForm.size, season: leagueForm.season });
      setShowCreateLeague(false);
      setLeagueForm({ name: '', teamName: '', type: 'redraft', scoring: 'standard', size: 12, season: '2025-26' });
    } catch (err) { setLeagueError(err.message || 'Failed to create league.'); }
    finally { setLeagueCreating(false); }
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>;
  }

  return (
    <>
      {/* Navbar */}
      <nav className="ff-top-navbar">
        <div className="ff-nav-left">
          <div className="ff-nav-logo">{'\u{1F3C8}'} Fantasy <span>League</span></div>
        </div>
        <div className="ff-nav-center">
          {user ? (
            <div className="ff-week-badge"><span className="ff-live-dot"></span> Week 12 — In Progress</div>
          ) : (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Sign in to access your leagues</div>
          )}
        </div>
        <div className="ff-nav-right">
          <button className="ff-dark-toggle" onClick={toggleTheme} title="Toggle dark mode">
            {theme === 'dark' ? '\u{2600}\u{FE0F}' : '\u{1F319}'}
          </button>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="ff-nav-settings-btn" onClick={() => setShowCreateLeague(true)}>{'\u{2795}'} Create a League</button>
              <div className="auth-avatar">{user.name.charAt(0).toUpperCase()}</div>
              <span className="auth-user-name">{user.name}</span>
              <button className="top-navbar-login" onClick={signout} style={{ marginLeft: 8 }}>Sign Out</button>
            </div>
          ) : (
            <>
              <button className="top-navbar-login" onClick={() => setShowAuthModal('signin')}>Sign In</button>
              <button className="top-navbar-signup" onClick={() => setShowAuthModal('signup')}>Create Account</button>
            </>
          )}
        </div>
      </nav>

      {/* Main Content */}
      {user ? (
        <>
          <div className="ff-hero" style={{ marginTop: 48 }}>
            <div className="ff-hero-left">
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                Welcome back, {user.name.split(' ')[0]}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Your fantasy football dashboard is ready.</p>
            </div>
            <div className="ff-hero-actions">
              <button className="ff-hero-action primary">{'\u{1F3C8}'} Set Lineup</button>
              <button className="ff-hero-action secondary">{'\u{1F50D}'} Check Waivers</button>
              <button className="ff-hero-action secondary">{'\u{1F91D}'} View Trades</button>
              <button className="ff-hero-action secondary" onClick={() => setShowCreateLeague(true)}>{'\u{2699}\u{FE0F}'} League Settings</button>
            </div>
          </div>
          <div className="ff-main-grid">
            <div className="ff-left">
              <MatchupWidget />
              <PlayerRankings />
              <NewsFeed />
            </div>
            <div className="ff-right">
              <StandingsCard />
              <WaiverWireCard />
              <PowerRankingsCard />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="ff-hero" style={{ marginTop: 48, minHeight: 'auto', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', paddingBottom: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{'\u{1F3C8}'}</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              Fantasy <span style={{ color: 'var(--brand-tan)' }}>League</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, maxWidth: 480, marginBottom: 28 }}>
              Your all-in-one fantasy football dashboard. Manage leagues, analyze trades, track players, and dominate your competition.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="ff-hero-action primary" style={{ fontSize: 15, padding: '14px 28px' }} onClick={() => setShowAuthModal('signup')}>Create Account</button>
              <button className="ff-hero-action secondary" style={{ fontSize: 15, padding: '14px 28px' }} onClick={() => setShowAuthModal('signin')}>Sign In</button>
            </div>
            <div style={{ marginTop: 40, display: 'flex', gap: 32, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
              <div>{'\u{1F4CA}'} 8 League Types</div>
              <div>{'\u{1F91D}'} Full Trade Center</div>
              <div>{'\u{1F4C8}'} 3 Years of Stats</div>
              <div>{'\u{2699}\u{FE0F}'} Custom Scoring</div>
            </div>
          </div>
          <div style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 1400, margin: '0 auto' }}>
            <NewsFeed />
          </div>
        </>
      )}

      {/* Footer */}
      <footer className="ff-footer">
        <div className="ff-footer-brand">Fantasy <span>League</span> <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 400, opacity: 0.6 }}>2025-26</span></div>
        <div className="ff-footer-links">
          <button className="ff-footer-link">League Rules</button>
          <button className="ff-footer-link">Scoring</button>
          <button className="ff-footer-link">Settings</button>
          <button className="ff-footer-link">Help</button>
        </div>
        <div className="ff-footer-credit">Built with the Veracity Design System</div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal mode={showAuthModal} onClose={() => setShowAuthModal(null)}
          onSwitch={() => setShowAuthModal(prev => prev === 'signin' ? 'signup' : 'signin')} />
      )}

      {/* Create League Modal */}
      {showCreateLeague && (
        <div className="auth-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCreateLeague(false); }}>
          <div className="auth-modal" style={{ width: 460 }}>
            <button className="auth-close" onClick={() => setShowCreateLeague(false)}>{'\u2715'}</button>
            <h2>{'\u{1F3C6}'} Create a League</h2>
            <p className="auth-subtitle">Set up your league and invite your friends.</p>
            <form onSubmit={handleCreateLeague}>
              <div className="auth-input-group">
                <label>League Name</label>
                <input className="auth-input" type="text" placeholder="Spero Championship League" value={leagueForm.name} onChange={e => setLeagueForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="auth-input-group">
                <label>Your Team Name</label>
                <input className="auth-input" type="text" placeholder="Gridiron Gladiators" value={leagueForm.teamName} onChange={e => setLeagueForm(f => ({ ...f, teamName: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>League Type</label>
                  <select className="auth-input" style={{ padding: '9px 12px' }} value={leagueForm.type} onChange={e => setLeagueForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="redraft">Redraft</option><option value="keeper">Keeper</option><option value="dynasty">Dynasty</option>
                    <option value="bestBall">Best Ball</option><option value="superflex">SuperFlex</option><option value="auction">Auction</option><option value="guillotine">Guillotine</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Scoring</label>
                  <select className="auth-input" style={{ padding: '9px 12px' }} value={leagueForm.scoring} onChange={e => setLeagueForm(f => ({ ...f, scoring: e.target.value }))}>
                    <option value="standard">Standard</option><option value="ppr">PPR</option><option value="halfPpr">Half PPR</option><option value="sixPtPassTd">6-Pt Pass TD</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Teams</label>
                  <select className="auth-input" style={{ padding: '9px 12px' }} value={leagueForm.size} onChange={e => setLeagueForm(f => ({ ...f, size: Number(e.target.value) }))}>
                    {[6,8,10,12,14,16,18,20].map(n => <option key={n} value={n}>{n} teams</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Season</label>
                  <select className="auth-input" style={{ padding: '9px 12px' }} value={leagueForm.season} onChange={e => setLeagueForm(f => ({ ...f, season: e.target.value }))}>
                    <option value="2025-26">2025-26</option><option value="2026-27">2026-27</option>
                  </select>
                </div>
              </div>
              {leagueError && <p className="auth-error">{leagueError}</p>}
              <button type="submit" className="auth-btn auth-btn-secondary" disabled={leagueCreating}>
                {leagueCreating ? 'Creating...' : '\u{1F3C8} Create League'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
