import { useState, useEffect, useRef } from 'react';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './context/ThemeContext';
import TeamPicker from './components/ui/TeamPicker';
import AuthModal from './components/auth/AuthModal';
import NewsFeed from './components/dashboard/NewsFeed';
import HubPage from './components/layout/HubPage';
import AdSpace from './components/ui/AdSpace';
import LeagueDashboard from './components/league/LeagueDashboard';
import QuickTradeCalc from './components/trade/QuickTradeCalc';
import * as leagueApi from './api/leagues';
import { getHistoricalStats } from './api/stats';
import { setHistoricalData } from './utils/hexScore';

export default function App() {
  const { user, loading, signout } = useAuth();
  const { theme, toggleTheme, teamId, setTeamId } = useTheme();
  const [showAuthModal, setShowAuthModal] = useState(null);
  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [leagueForm, setLeagueForm] = useState({ name: '', teamName: '', type: 'redraft', scoring: 'standard', size: 12, season: '2025-26' });
  const [leagueError, setLeagueError] = useState('');
  const [leagueCreating, setLeagueCreating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [leagues, setLeagues] = useState([]);
  const [leaguesLoading, setLeaguesLoading] = useState(false);
  const [activeLeague, setActiveLeague] = useState(null);
  const [leagueTab, setLeagueTab] = useState(null);
  const [showLeagueSwitcher, setShowLeagueSwitcher] = useState(false);
  const [switcherIndex, setSwitcherIndex] = useState(-1);
  const leagueSwitcherRef = useRef(null);

  useEffect(() => {
    if (!user) { setLeagues([]); setActiveLeague(null); return; }
    setLeaguesLoading(true);
    leagueApi.getLeagues()
      .then(data => setLeagues(data.leagues || []))
      .catch(() => {})
      .finally(() => setLeaguesLoading(false));
  }, [user]);

  // Load historical stats from server and inject into HexScore engine
  useEffect(() => {
    getHistoricalStats()
      .then(data => { if (data?.players) setHistoricalData(data); })
      .catch(() => {}); // Falls back to players.js avg values
  }, []);

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

  const handleDeleteLeague = async (leagueId) => {
    setDeleting(true);
    try {
      await leagueApi.deleteLeague(leagueId);
      setLeagues(prev => prev.filter(lg => lg.id !== leagueId));
      if (activeLeague && activeLeague.id === leagueId) setActiveLeague(null);
      setDeleteConfirmId(null);
    } catch (err) { alert(err.message || 'Failed to delete league.'); }
    finally { setDeleting(false); }
  };

  if (loading) {
    return <div className="ff-loading-screen">Loading...</div>;
  }

  if (user && activeLeague) {
    return (
      <>
        <nav className="ff-top-navbar">
          <div className="ff-nav-left">
            <div className="ff-nav-logo" style={{ cursor: 'pointer' }} onClick={() => setActiveLeague(null)}><img src="/logo-icon.png" alt="" className="ff-nav-logo-icon" />Hex<span>Metrics</span></div>
            <span className="ff-nav-breadcrumb-sep">/</span>
            <span className="ff-nav-breadcrumb-label">{activeLeague.name}</span>
          </div>
          <div className="ff-nav-center" ref={leagueSwitcherRef} style={{ position: 'relative' }}>
            <button className="ff-leagues-trigger"
              onClick={() => { setShowLeagueSwitcher(prev => !prev); setSwitcherIndex(-1); }}
              onKeyDown={(e) => {
                if (!showLeagueSwitcher && (e.key === 'ArrowDown' || e.key === 'Enter')) {
                  e.preventDefault(); setShowLeagueSwitcher(true); setSwitcherIndex(0);
                } else if (showLeagueSwitcher) {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setSwitcherIndex(i => Math.min(i + 1, leagues.length - 1)); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setSwitcherIndex(i => Math.max(i - 1, 0)); }
                  else if (e.key === 'Enter' && switcherIndex >= 0) { e.preventDefault(); setActiveLeague(leagues[switcherIndex]); setShowLeagueSwitcher(false); }
                  else if (e.key === 'Escape') { e.preventDefault(); setShowLeagueSwitcher(false); }
                }
              }}>
              <span className="ff-live-dot league-dot"></span>
              <span className="league-name">{activeLeague.name}</span>
              <span className={`chevron${showLeagueSwitcher ? ' open' : ''}`}>{'\u25BE'}</span>
            </button>
            {showLeagueSwitcher && (
              <div className="ff-leagues-dropdown">
                <div className="ff-leagues-dropdown-header">
                  <h3>My Leagues</h3>
                  <span className="ff-leagues-dropdown-count">{leagues.length}</span>
                </div>
                {leagues.map((lg, i) => (
                  <div key={lg.id}
                    className={`ff-leagues-item${lg.id === activeLeague.id ? ' active' : ''}${i === switcherIndex ? ' focused' : ''}`}
                    onClick={() => { setActiveLeague(lg); setShowLeagueSwitcher(false); }}>
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
            <button className="ff-dark-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            <div className="auth-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <span className="auth-user-name">{user.name}</span>
            <button className="top-navbar-login" onClick={signout}>Sign Out</button>
          </div>
        </nav>
        <LeagueDashboard league={activeLeague} onBack={() => setActiveLeague(null)} activeTab={leagueTab} onTabChange={setLeagueTab} />
        <footer className="ff-footer">
          <div className="ff-footer-brand"><img src="/logo-icon.png" alt="" className="ff-footer-logo-icon" />Hex<span>Metrics</span> <span className="ff-footer-season">2025-26</span></div>
          <div className="ff-footer-links">
            <button className="ff-footer-link" onClick={() => setActiveLeague(null)}>Home</button>
            <button className="ff-footer-link disabled" disabled>Help</button>
          </div>
          <div className="ff-footer-credit">&copy; 2025 HexMetrics</div>
        </footer>
      </>
    );
  }

  return (
    <>
      <nav className="ff-top-navbar">
        <div className="ff-nav-left">
          <div className="ff-nav-logo"><img src="/logo-icon.png" alt="" className="ff-nav-logo-icon" />Hex<span>Metrics</span></div>
        </div>
        <div className="ff-nav-center">
          {user ? (
            <div className="ff-nav-hint-bright">
              {leagues.length > 0 ? `${leagues.length} league${leagues.length > 1 ? 's' : ''}` : 'Get started by creating a league'}
            </div>
          ) : (
            <div className="ff-nav-hint">Sign in to access your leagues</div>
          )}
        </div>
        <div className="ff-nav-right">
          <TeamPicker value={teamId} onChange={setTeamId} />
          <button className="ff-dark-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
          {user ? (
            <div className="ff-nav-user-group">
              <button className="ff-create-league-btn" onClick={() => setShowCreateLeague(true)}>+ Create a League</button>
              <div className="auth-avatar">{user.name.charAt(0).toUpperCase()}</div>
              <span className="auth-user-name">{user.name}</span>
              <button className="top-navbar-login" onClick={signout}>Sign Out</button>
            </div>
          ) : (
            <>
              <button className="top-navbar-login" onClick={() => setShowAuthModal('signin')}>Sign In</button>
              <button className="top-navbar-signup" onClick={() => setShowAuthModal('signup')}>Create Account</button>
            </>
          )}
        </div>
      </nav>

      {user ? (
        <HubPage
          leagues={leagues}
          leaguesLoading={leaguesLoading}
          onSelectLeague={setActiveLeague}
          onCreateLeague={() => setShowCreateLeague(true)}
          onDeleteLeague={setDeleteConfirmId}
          onLeagueJoined={(league) => { setLeagues(prev => [league, ...prev]); setActiveLeague(league); }}
          userName={user.name}
        />
      ) : (
        <>
          <div className="ff-hero ff-hero-landing" style={{ marginTop: 48 }}>
            <img src="/logo-full.png" alt="HexMetrics" className="ff-hero-logo" />
            <p>Your all-in-one fantasy football dashboard. Manage leagues, analyze trades, track players, and dominate your competition.</p>
            <div className="ff-hero-landing-actions">
              <button className="ff-hero-action ff-hero-landing-action primary" onClick={() => setShowAuthModal('signup')}>Create Account</button>
              <button className="ff-hero-action ff-hero-landing-action secondary" onClick={() => setShowAuthModal('signin')}>Sign In</button>
            </div>
            <div className="ff-hero-landing-features">
              <div>Trade Calculator</div>
              <div>Multiple Leagues</div>
              <div>Live News Feed</div>
              <div>Custom Scoring</div>
            </div>
          </div>
          <div className="ff-tab-content-wide" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
            <div>
              <QuickTradeCalc
                onSignIn={() => setShowAuthModal('signin')}
                onSignUp={() => setShowAuthModal('signup')}
              />
              <div style={{ marginTop: 16 }}><AdSpace size="sm" /></div>
            </div>
            <NewsFeed />
          </div>
        </>
      )}

      <footer className="ff-footer">
        <div className="ff-footer-brand"><img src="/logo-icon.png" alt="" className="ff-footer-logo-icon" />Hex<span>Metrics</span> <span className="ff-footer-season">2025-26</span></div>
        <div className="ff-footer-links">
          <button className="ff-footer-link disabled" disabled>Help</button>
        </div>
        <div className="ff-footer-credit">&copy; 2025 HexMetrics</div>
      </footer>

      {showAuthModal && (
        <AuthModal mode={showAuthModal} onClose={() => setShowAuthModal(null)}
          onSwitch={() => setShowAuthModal(prev => prev === 'signin' ? 'signup' : 'signin')} />
      )}

      {showCreateLeague && (
        <div className="auth-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCreateLeague(false); }}>
          <div className="auth-modal" style={{ width: 460 }}>
            <button className="auth-close" onClick={() => setShowCreateLeague(false)}>{'\u2715'}</button>
            <h2>Create a League</h2>
            <p className="auth-subtitle">Set up your league and invite your friends.</p>
            <form onSubmit={handleCreateLeague}>
              <div className="auth-input-group">
                <label>League Name</label>
                <input className="auth-input" type="text" placeholder="My Championship League" value={leagueForm.name} onChange={e => setLeagueForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="auth-input-group">
                <label>Your Team Name</label>
                <input className="auth-input" type="text" placeholder="Team Name" value={leagueForm.teamName} onChange={e => setLeagueForm(f => ({ ...f, teamName: e.target.value }))} />
              </div>
              <div className="ff-form-row">
                <div className="ff-form-col">
                  <label className="ff-form-label">League Type</label>
                  <select className="auth-input" value={leagueForm.type} onChange={e => setLeagueForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="redraft">Redraft</option><option value="keeper">Keeper</option><option value="dynasty">Dynasty</option>
                    <option value="bestBall">Best Ball</option><option value="superflex">SuperFlex</option><option value="auction">Auction</option><option value="guillotine">Guillotine</option>
                  </select>
                </div>
                <div className="ff-form-col">
                  <label className="ff-form-label">Scoring</label>
                  <select className="auth-input" value={leagueForm.scoring} onChange={e => setLeagueForm(f => ({ ...f, scoring: e.target.value }))}>
                    <option value="standard">Standard</option><option value="ppr">PPR</option><option value="halfPpr">Half PPR</option><option value="sixPtPassTd">6-Pt Pass TD</option>
                  </select>
                </div>
              </div>
              <div className="ff-form-row">
                <div className="ff-form-col">
                  <label className="ff-form-label">Teams</label>
                  <select className="auth-input" value={leagueForm.size} onChange={e => setLeagueForm(f => ({ ...f, size: Number(e.target.value) }))}>
                    {[6,8,10,12,14,16,18,20].map(n => <option key={n} value={n}>{n} teams</option>)}
                  </select>
                </div>
                <div className="ff-form-col">
                  <label className="ff-form-label">Season</label>
                  <select className="auth-input" value={leagueForm.season} onChange={e => setLeagueForm(f => ({ ...f, season: e.target.value }))}>
                    <option value="2025-26">2025-26</option><option value="2026-27">2026-27</option>
                  </select>
                </div>
              </div>
              {leagueError && <p className="auth-error">{leagueError}</p>}
              <button type="submit" className="auth-btn auth-btn-secondary" disabled={leagueCreating}>
                {leagueCreating ? 'Creating...' : 'Create League'}
              </button>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="auth-overlay" onClick={e => { if (e.target === e.currentTarget) setDeleteConfirmId(null); }}>
          <div className="auth-modal ff-delete-modal">
            <h2>Delete League?</h2>
            <p>This will permanently delete this league and remove all members. This cannot be undone.</p>
            <div className="ff-delete-modal-actions">
              <button className="ff-btn-cancel" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
              <button className="ff-btn-delete" onClick={() => handleDeleteLeague(deleteConfirmId)} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete League'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
