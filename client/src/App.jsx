import { useState, useEffect, useRef } from 'react';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './context/ThemeContext';
import TeamPicker from './components/ui/TeamPicker';
import AuthModal from './components/auth/AuthModal';
import NewsFeed from './components/dashboard/NewsFeed';
import HubPage from './components/layout/HubPage';
import AdSpace from './components/ui/AdSpace';
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
            <div className="ff-nav-logo" style={{ cursor: 'pointer' }} onClick={() => setActiveLeague(null)}>Hex<span>Metrics</span></div>
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
            <button className="ff-dark-toggle" onClick={toggleTheme}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
            <div className="auth-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <span className="auth-user-name">{user.name}</span>
            <button className="top-navbar-login" onClick={signout}>Sign Out</button>
          </div>
        </nav>
        <LeagueDashboard league={activeLeague} onBack={() => setActiveLeague(null)} activeTab={leagueTab} onTabChange={setLeagueTab} />
        <footer className="ff-footer">
          <div className="ff-footer-brand">Hex<span>Metrics</span> <span className="ff-footer-season">2025-26</span></div>
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
      <nav className="ff-top-navbar">
        <div className="ff-nav-left">
          <div className="ff-nav-logo">Hex<span>Metrics</span></div>
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
          <button className="ff-dark-toggle" onClick={toggleTheme} title="Toggle dark mode">
            {theme === 'dark' ? 'Light' : 'Dark'}
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
          userName={user.name}
        />
      ) : (
        <>
          <div className="ff-hero ff-hero-landing" style={{ marginTop: 48 }}>
            <h1>Hex<span>Metrics</span></h1>
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
          <div className="ff-tab-content-wide">
            <AdSpace size="sm" />
            <NewsFeed />
          </div>
        </>
      )}

      <footer className="ff-footer">
        <div className="ff-footer-brand">Hex<span>Metrics</span> <span className="ff-footer-season">2025-26</span></div>
        <div className="ff-footer-links">
          <button className="ff-footer-link">Help</button>
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
