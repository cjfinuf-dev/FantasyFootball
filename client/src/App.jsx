import { useState, useEffect, useRef } from 'react';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './context/ThemeContext';
import TeamPicker from './components/ui/TeamPicker';
import AuthModal from './components/auth/AuthModal';
import NewsFeed from './components/dashboard/NewsFeed';
import LeagueDashboard from './components/league/LeagueDashboard';
import * as leagueApi from './api/leagues';

export default function App() {
  const { user, loading, signout } = useAuth();
  const { theme, toggleTheme, teamId, setTeamId } = useTheme();
  const [showAuthModal, setShowAuthModal] = useState(null);
  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [leagueForm, setLeagueForm] = useState({ name: '', teamName: '', type: 'redraft', scoring: 'standard', size: 12, season: '2025-26' });
  const [leagueError, setLeagueError] = useState('');
  const [leagueCreating, setLeagueCreating] = useState(false);

  // Leagues state
  const [leagues, setLeagues] = useState([]);
  const [leaguesLoading, setLeaguesLoading] = useState(false);
  const [activeLeague, setActiveLeague] = useState(null); // null = hub, object = league page
  const [showLeagueSwitcher, setShowLeagueSwitcher] = useState(false);
  const leagueSwitcherRef = useRef(null);

  // Fetch leagues when user logs in
  useEffect(() => {
    if (!user) { setLeagues([]); setActiveLeague(null); return; }
    setLeaguesLoading(true);
    leagueApi.getLeagues()
      .then(data => setLeagues(data.leagues || []))
      .catch(() => {})
      .finally(() => setLeaguesLoading(false));
  }, [user]);

  // Close league switcher on outside click
  useEffect(() => {
    const handler = (e) => {
      if (leagueSwitcherRef.current && !leagueSwitcherRef.current.contains(e.target)) setShowLeagueSwitcher(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCreateLeague = async (e) => {
    e.preventDefault();
    setLeagueError('');
    if (!leagueForm.name.trim() || !leagueForm.teamName.trim()) { setLeagueError('League name and team name are required.'); return; }
    setLeagueCreating(true);
    try {
      const { league } = await leagueApi.createLeague({ name: leagueForm.name, teamName: leagueForm.teamName, type: leagueForm.type, scoringPreset: leagueForm.scoring, leagueSize: leagueForm.size, season: leagueForm.season });
      setLeagues(prev => [league, ...prev]);
      setShowCreateLeague(false);
      setLeagueForm({ name: '', teamName: '', type: 'redraft', scoring: 'standard', size: 12, season: '2025-26' });
    } catch (err) { setLeagueError(err.message || 'Failed to create league.'); }
    finally { setLeagueCreating(false); }
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>;
  }

  // If viewing a specific league, render the league dashboard
  if (user && activeLeague) {
    return (
      <>
        <nav className="ff-top-navbar">
          <div className="ff-nav-left">
            <div className="ff-nav-logo" style={{ cursor: 'pointer' }} onClick={() => setActiveLeague(null)}>{'\u{1F3C8}'} Hex<span>Metrics</span></div>
          </div>
          <div className="ff-nav-center" ref={leagueSwitcherRef} style={{ position: 'relative' }}>
            <button className="ff-leagues-trigger" onClick={() => setShowLeagueSwitcher(prev => !prev)}>
              <span className="ff-live-dot league-dot"></span>
              <span className="league-name">{activeLeague.name}</span>
              <span className={`chevron${showLeagueSwitcher ? ' open' : ''}`}>{'\u25BE'}</span>
            </button>
            {showLeagueSwitcher && (
              <div className="ff-leagues-dropdown">
                <div className="ff-leagues-dropdown-header">
                  <h3>{'\u{1F3C8}'} My Leagues</h3>
                  <span className="ff-leagues-dropdown-count">{leagues.length}</span>
                </div>
                {leagues.map(lg => (
                  <div key={lg.id}
                    className={`ff-leagues-item${lg.id === activeLeague.id ? ' active' : ''}`}
                    onClick={() => { setActiveLeague(lg); setShowLeagueSwitcher(false); }}>
                    <div className="ff-leagues-item-logo">{'\u{1F3C8}'}</div>
                    <div className="ff-leagues-item-info">
                      <div className="ff-leagues-item-name">{lg.name}</div>
                      <div className="ff-leagues-item-meta">
                        <span>{lg.team_name}</span>
                        <span>&middot;</span>
                        <span>{lg.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="ff-nav-right">
            <TeamPicker value={teamId} onChange={setTeamId} />
            <button className="ff-dark-toggle" onClick={toggleTheme}>{theme === 'dark' ? '\u{2600}\u{FE0F}' : '\u{1F319}'}</button>
            <div className="auth-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <span className="auth-user-name">{user.name}</span>
            <button className="top-navbar-login" onClick={signout} style={{ marginLeft: 8 }}>Sign Out</button>
          </div>
        </nav>
        <LeagueDashboard league={activeLeague} onBack={() => setActiveLeague(null)} />
        <footer className="ff-footer">
          <div className="ff-footer-brand">Hex<span>Metrics</span> <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 400, opacity: 0.6 }}>2025-26</span></div>
          <div className="ff-footer-links">
            <button className="ff-footer-link" onClick={() => setActiveLeague(null)}>Home</button>
            <button className="ff-footer-link">Help</button>
          </div>
          <div className="ff-footer-credit">&copy; 2025 HexMetrics</div>
        </footer>
      </>
    );
  }

  return (
    <>
      {/* Navbar */}
      <nav className="ff-top-navbar">
        <div className="ff-nav-left">
          <div className="ff-nav-logo">{'\u{1F3C8}'} Hex<span>Metrics</span></div>
        </div>
        <div className="ff-nav-center">
          {user ? (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              {leagues.length > 0 ? `${leagues.length} league${leagues.length > 1 ? 's' : ''}` : 'Get started by creating a league'}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Sign in to access your leagues</div>
          )}
        </div>
        <div className="ff-nav-right">
          <TeamPicker value={teamId} onChange={setTeamId} />
          <button className="ff-dark-toggle" onClick={toggleTheme} title="Toggle dark mode">
            {theme === 'dark' ? '\u{2600}\u{FE0F}' : '\u{1F319}'}
          </button>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="ff-create-league-btn" onClick={() => setShowCreateLeague(true)}>{'\u{2795}'} Create a League</button>
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

      {/* LOGGED IN — Hub Page */}
      {user ? (
        <>
          {/* Compact Greeting */}
          <div className="ff-hub-banner">
            <div>
              <h1>Welcome back, {user.name.split(' ')[0]}</h1>
              <p>Your fantasy football hub.</p>
            </div>
          </div>

          <div className="ff-hub-grid">
            <div className="ff-hub-left">
              {/* My Leagues Section */}
              <div className="ff-card">
                <div className="ff-card-top-accent" style={{ background: 'var(--copper)' }} />
                <div className="ff-card-header">
                  <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>{'\u{1F3C6}'} My Leagues</h2>
                </div>
                <div className="ff-card-body">
                  {leaguesLoading ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20, fontSize: 13 }}>Loading leagues...</div>
                  ) : leagues.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                      <div style={{ fontSize: 36, marginBottom: 12 }}>{'\u{1F3C8}'}</div>
                      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No leagues yet</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Create your first league or join one to get started.</div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button className="ff-btn ff-btn-copper" onClick={() => setShowCreateLeague(true)}>{'\u{2795}'} Create a League</button>
                        <button className="ff-btn ff-btn-secondary">{'\u{1F517}'} Join a League</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                      {leagues.map(lg => (
                        <div key={lg.id}
                          className="ff-league-card"
                          tabIndex={0}
                          role="button"
                          onClick={() => setActiveLeague(lg)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveLeague(lg); } }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <div className="ff-league-card-icon">{'\u{1F3C8}'}</div>
                            <div>
                              <div className="ff-league-card-name">{lg.name}</div>
                              <div className="ff-league-card-meta">{lg.team_name} &middot; {lg.role === 'commissioner' ? 'Commissioner' : 'Member'}</div>
                            </div>
                          </div>
                          <div className="ff-league-card-badges">
                            <span className="ff-league-card-badge">{lg.type}</span>
                            <span className="ff-league-card-badge">{lg.scoring_preset}</span>
                            <span className="ff-league-card-badge">{lg.league_size} teams</span>
                            <span className="ff-league-card-season">{lg.season}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Trade Calculator (generic) */}
              <div className="ff-card">
                <div className="ff-card-top-accent" style={{ background: 'var(--brand-tan)' }} />
                <div className="ff-card-header">
                  <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>{'\u{1F4CA}'} Trade Calculator</h2>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Generic values &middot; Join a league for personalized analysis</span>
                </div>
                <div className="ff-card-body" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{'\u{1F4CA}'}</div>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>Compare player trade values across formats</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-grey)' }}>League-specific trade analysis available inside your leagues</div>
                </div>
              </div>
            </div>

            <div className="ff-hub-right">
              <NewsFeed />
            </div>
          </div>
        </>
      ) : (
        /* LOGGED OUT — Landing Page */
        <>
          <div className="ff-hero" style={{ marginTop: 48, minHeight: 'auto', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', paddingBottom: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{'\u{1F3C8}'}</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              Hex<span style={{ color: 'var(--accent-secondary-text)' }}>Metrics</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, maxWidth: 480, marginBottom: 28 }}>
              Your all-in-one fantasy football dashboard. Manage leagues, analyze trades, track players, and dominate your competition with HexMetrics.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="ff-hero-action primary" style={{ fontSize: 15, padding: '14px 28px' }} onClick={() => setShowAuthModal('signup')}>Create Account</button>
              <button className="ff-hero-action secondary" style={{ fontSize: 15, padding: '14px 28px' }} onClick={() => setShowAuthModal('signin')}>Sign In</button>
            </div>
            <div style={{ marginTop: 40, display: 'flex', gap: 32, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
              <div>{'\u{1F4CA}'} Trade Calculator</div>
              <div>{'\u{1F3C6}'} Multiple Leagues</div>
              <div>{'\u{1F4F0}'} Live News Feed</div>
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
        <div className="ff-footer-brand">Hex<span>Metrics</span> <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 400, opacity: 0.6 }}>2025-26</span></div>
        <div className="ff-footer-links">
          <button className="ff-footer-link">Help</button>
        </div>
        <div className="ff-footer-credit">&copy; 2025 HexMetrics</div>
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
