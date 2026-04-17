import { useNavigate, useLocation, useMatch } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { useLeagues } from '../../hooks/useLeagues';
import TeamPicker from '../ui/TeamPicker';
import LeagueSwitcher from './LeagueSwitcher';
import LiveStatusBar from './LiveStatusBar';

export default function TopNav({ onSignIn, onSignUp, onCreateLeague }) {
  const { user, signout } = useAuth();
  const { theme, toggleTheme, teamId, setTeamId } = useTheme();
  const { leagues } = useLeagues();
  const navigate = useNavigate();
  const location = useLocation();
  const leagueMatch = useMatch('/league/:leagueId/:tab?');
  const leagueId = leagueMatch?.params?.leagueId;
  const activeTab = leagueMatch?.params?.tab;

  const activeLeague = leagueId ? leagues.find(lg => lg.id === leagueId) : null;
  const isLeagueView = !!leagueId;

  const handleSignout = async () => {
    await signout();
    navigate('/');
  };

  const handleLeagueSelect = (lg) => {
    navigate(`/league/${lg.id}`);
  };

  const ThemeToggle = (
    <button className="ff-dark-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
      {theme === 'dark' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );

  return (
    <nav className="ff-top-navbar">
      <div className="ff-nav-left">
        <div className="ff-nav-logo" style={{ cursor: 'pointer' }} onClick={() => navigate(user ? '/hub' : '/')}>
          <img src="/logo-full.png" alt="HexMetrics" width="112" height="28" style={{ height: 'var(--logo-height-nav)', width: 'var(--logo-width-nav)' }} />
        </div>
        {isLeagueView && activeLeague && (
          <nav aria-label="breadcrumb" style={{ display: 'contents' }}>
            <span className="ff-nav-breadcrumb-sep" aria-hidden="true">/</span>
            <span className="ff-nav-breadcrumb-label">{activeLeague.name}</span>
            {activeTab && (
              <>
                <span className="ff-nav-breadcrumb-sep" aria-hidden="true">/</span>
                <span className="ff-nav-breadcrumb-label" aria-current="page">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
              </>
            )}
          </nav>
        )}
      </div>

      <div className="ff-nav-center">
        {user && leagues.length > 0 ? (
          <LeagueSwitcher leagues={leagues} activeLeague={activeLeague} onSelect={handleLeagueSelect} />
        ) : user ? (
          <div className="ff-nav-hint-bright">Get started by creating a league</div>
        ) : (
          <div className="ff-nav-hub-links">
            <button className={`ff-nav-hub-link${location.pathname === '/hub/players' ? ' active' : ''}`}
              onClick={() => navigate('/hub/players')}>Players</button>
            <button className={`ff-nav-hub-link${location.pathname === '/hub/compare' ? ' active' : ''}`}
              onClick={() => navigate('/hub/compare')}>Compare</button>
            <button className={`ff-nav-hub-link${location.pathname === '/hub/news' ? ' active' : ''}`}
              onClick={() => navigate('/hub/news')}>News</button>
          </div>
        )}
      </div>

      <div className="ff-nav-right">
        <LiveStatusBar />
        <TeamPicker value={teamId} onChange={setTeamId} />
        {ThemeToggle}
        {user ? (
          <div className="ff-nav-user-group">
            <button className={`ff-create-league-btn${isLeagueView ? ' ff-create-league-btn--compact' : ''}`} onClick={onCreateLeague}>+ New League</button>
            <div className="auth-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <span className="auth-user-name">{user.name}</span>
            <button className="top-navbar-login" onClick={handleSignout}>Sign Out</button>
          </div>
        ) : (
          <>
            <button className="top-navbar-login" onClick={onSignIn}>Sign In</button>
            <button className="top-navbar-signup" onClick={onSignUp}>Create Account</button>
          </>
        )}
      </div>
    </nav>
  );
}
